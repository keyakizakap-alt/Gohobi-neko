import { expect, test, type Page } from "@playwright/test";

async function start(page: Page, name = "たま") {
  await page.goto("/");
  await page.locator('input[name="catName"]').fill(name);
  await page.getByRole("button", { name: "いっしょに はじめる" }).click();
  await expect(page.getByTestId("cat-name")).toHaveText(name);
}

/**
 * ヘッドレス Chromium は通知を許可しても Notification.permission が "denied" のままになる
 * （Permissions API では "granted"）。実際のブラウザでは一致するので、テストでは許可済みとして扱う。
 */
const GRANT_NOTIFICATION = () => {
  Object.defineProperty(Notification, "permission", { get: () => "granted", configurable: true });
  Notification.requestPermission = async () => "granted";
};

const toDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

test("メモを貼り付けて、候補を直してからまとめて追加する", async ({ page }) => {
  await start(page);
  await page.getByRole("button", { name: /追加/ }).first().click();
  await page.getByRole("dialog").locator('input[name="title"]').fill("牛乳を買う");
  await page.getByRole("dialog").getByRole("button", { name: "追加する" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByTestId("task-item")).toHaveCount(1);

  await page.goto("/tasks");
  await page.getByRole("link", { name: "取り込む" }).click();
  await expect(page).toHaveURL(/\/tasks\/import$/);
  await page.getByLabel("取り込むテキスト").fill(["・企画書を送る 12/20まで", "・牛乳を買う", "[x] 済んだこと", "・明日 歯医者の予約"].join("\n"));
  await page.getByRole("button", { name: "読み取る" }).click();

  const rows = page.getByTestId("import-row");
  await expect(rows).toHaveCount(3);
  await expect(page.getByText("完了済みの印があるため飛ばしました")).toBeVisible();
  // 期限を読み取っている
  await expect(rows.nth(0).getByLabel("期限")).toHaveValue(/-12-20$/);
  // 既存と同じ名前のタスクは、最初から外してある
  await expect(rows.nth(1).getByText("同じ名前のタスクがすでにあります")).toBeVisible();
  await expect(rows.nth(1).getByRole("checkbox")).not.toBeChecked();
  // 候補を直す：名前を変えて、むずかしさを「たいへん」に
  await rows.nth(2).getByLabel("タスク名").fill("歯医者を予約する");
  await rows.nth(2).getByRole("radio", { name: /たいへん/ }).click();

  await page.getByRole("button", { name: "2件を追加する" }).click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByRole("status")).toContainText("2件のタスクを追加しました");
  await expect(page.getByTestId("task-item")).toHaveCount(3);
  await expect(page.getByText("歯医者を予約する")).toBeVisible();
  await expect(page.getByText("企画書を送る")).toBeVisible();

  // リロードしても残っている
  await page.reload();
  await expect(page.getByTestId("task-item")).toHaveCount(3);
});

test("プラグインのJSONファイルを読み込める。壊れた入力はエラーを出す", async ({ page }) => {
  await start(page);
  await page.goto("/tasks/import");
  await page.getByLabel("取り込むテキスト").fill("```json\n{ broken\n```");
  await page.getByRole("button", { name: "読み取る" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "JSON" })).toBeVisible();

  const json = { app: "gohobi-neko", type: "tasks", tasks: [{ title: "<img src=x onerror=window.__x=1>", difficulty: "hard", dueDate: "2026-12-01", memo: "メモ" }, { title: "B" }] };
  await page.getByTestId("import-tasks-file").setInputFiles({ name: "tasks.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(json)) });
  await expect(page.getByTestId("import-row")).toHaveCount(2);
  await expect(page.getByTestId("import-row").first().getByRole("radio", { name: /たいへん/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "2件を追加する" }).click();
  await expect(page.getByText("<img src=x onerror=window.__x=1>")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __x?: number }).__x)).toBeUndefined();
});

test("通知をオンにすると、期限が今日・明日のタスクを1回だけ知らせる", async ({ page, context, baseURL }) => {
  await context.grantPermissions(["notifications"], { origin: baseURL });
  // 9時台に固定し、表示された通知を記録する
  const now = new Date();
  now.setHours(9, 30, 0, 0);
  await page.clock.install({ time: now.getTime() });
  await page.addInitScript(GRANT_NOTIFICATION);
  await page.addInitScript(() => {
    const w = window as unknown as { __shown: { title: string; body?: string }[] };
    w.__shown = [];
    const record = (title: string, opts?: NotificationOptions) => w.__shown.push({ title, body: opts?.body });
    ServiceWorkerRegistration.prototype.showNotification = async function (title: string, opts?: NotificationOptions) {
      record(title, opts);
    };
  });
  await start(page);

  const tomorrow = new Date(now.getTime() + 86_400_000);
  for (const [title, due] of [["今日の提出", toDateKey(now)], ["明日の準備", toDateKey(tomorrow)], ["来月のこと", "2099-01-01"]] as const) {
    await page.getByRole("button", { name: /追加/ }).first().click();
    const d = page.getByRole("dialog");
    await d.locator('input[name="title"]').fill(title);
    await d.locator('input[name="dueDate"]').fill(due);
    await d.getByRole("button", { name: "追加する" }).click();
    await expect(d).toBeHidden();
  }

  await page.goto("/settings");
  await page.getByText("通知する").click();
  await expect(page.getByTestId("notify-toggle")).toBeChecked();
  await expect(page.getByTestId("notify-status")).toContainText("許可されています");

  const shown = () => page.evaluate(() => (window as unknown as { __shown: { title: string; body?: string }[] }).__shown);
  await expect.poll(async () => (await shown()).length, { timeout: 10_000 }).toBe(1);
  const [n] = await shown();
  expect(n!.title).toBe("今日までのタスクが1件あるにゃ");
  expect(n!.body).toContain("「今日の提出」");
  expect(n!.body).toContain("「明日の準備」");
  expect(n!.body).not.toContain("来月のこと");

  // 時間が進んでも、リロードしても、同じ通知は出ない
  await page.clock.runFor(5 * 60_000);
  await page.reload();
  await page.waitForTimeout(800);
  expect(await shown()).toEqual([]);

  // テスト通知
  await page.getByRole("button", { name: "テスト通知を送る" }).click();
  await expect.poll(async () => (await shown()).map((s) => s.title)).toEqual(["ごほうびねこ"]);
});

test("通知の時刻より前は知らせない", async ({ page, context, baseURL }) => {
  await context.grantPermissions(["notifications"], { origin: baseURL });
  const now = new Date();
  now.setHours(7, 0, 0, 0);
  await page.clock.install({ time: now.getTime() });
  await page.addInitScript(GRANT_NOTIFICATION);
  await page.addInitScript(() => {
    const w = window as unknown as { __count: number };
    w.__count = 0;
    ServiceWorkerRegistration.prototype.showNotification = async function () {
      w.__count++;
    };
  });
  await start(page);
  await page.getByRole("button", { name: /追加/ }).first().click();
  await page.getByRole("dialog").locator('input[name="title"]').fill("今日の提出");
  await page.getByRole("dialog").locator('input[name="dueDate"]').fill(toDateKey(now));
  await page.getByRole("dialog").getByRole("button", { name: "追加する" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.goto("/settings");
  await page.getByText("通知する").click();
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => (window as unknown as { __count: number }).__count)).toBe(0);
  // 9時を過ぎたら知らせる（状態管理は1分ごとに時刻を更新する）
  await page.clock.runFor(2 * 60 * 60_000 + 60_000);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __count: number }).__count), { timeout: 10_000 }).toBe(1);
});
