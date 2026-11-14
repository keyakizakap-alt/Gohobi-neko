import { expect, test, type Page } from "@playwright/test";

/** 初回起動：ねこに名前をつけてホームを表示する */
async function start(page: Page, name = "たま") {
  await page.goto("/");
  await page.locator('input[name="catName"]').fill(name);
  await page.getByRole("button", { name: "いっしょに はじめる" }).click();
  await expect(page.getByTestId("cat-name")).toHaveText(name);
}

async function addTask(page: Page, title: string, difficulty: "easy" | "normal" | "hard" = "normal") {
  await page.getByRole("button", { name: /追加/ }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[name="title"]').fill(title);
  await dialog.locator(`.choice__item:has(input[value="${difficulty}"])`).click();
  await dialog.getByRole("button", { name: "追加する" }).click();
  await expect(dialog).toBeHidden();
}

const nav = (page: Page, label: string) => page.getByRole("navigation").getByRole("link", { name: new RegExp(label) });

test("初回起動で名前をつけ、空の名前は受け付けない", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "いっしょに はじめる" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("なまえを入力してください");
  await page.locator('input[name="catName"]').fill("みけ");
  await page.getByRole("button", { name: "いっしょに はじめる" }).click();
  await expect(page.getByTestId("cat-name")).toHaveText("みけ");
  await expect(page.getByTestId("cat-level")).toHaveText("1");
  await expect(page.getByTestId("count-kibble")).toHaveText("1");
});

test("タスク完了→エサ獲得→エサやり→レベルアップまで通しで動く", async ({ page }) => {
  await start(page);
  await addTask(page, "洗濯物をたたむ", "hard");
  await expect(page.getByTestId("task-item")).toHaveCount(1);
  await expect(page.getByTestId("count-feast")).toHaveText("0");
  await expect(page.getByTestId("feed-feast")).toBeDisabled();

  await page.getByRole("button", { name: "「洗濯物をたたむ」を完了にする" }).click();
  await expect(page.getByRole("status")).toContainText("ごちそう缶 を1つ ゲット");
  await expect(page.getByTestId("count-feast")).toHaveText("1");
  // 今日おえたタスクは、取り消し線つきで一覧に残る
  await expect(page.getByTestId("task-item")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "「洗濯物をたたむ」を未完了に戻す" })).toBeVisible();
  await expect(page.getByTestId("tile-done")).toHaveText("1");
  await expect(page.getByTestId("tile-food")).toHaveText("2");
  await page.getByRole("tab", { name: "未完了" }).click();
  await expect(page.getByTestId("task-item")).toHaveCount(0);

  await page.getByTestId("feed-feast").click();
  await expect(page.getByTestId("count-feast")).toHaveText("0");
  // 35XP → Lv2（必要20XP）で残り15XP
  await expect(page.getByTestId("levelup-level")).toHaveText("Lv.2");
  await page.getByRole("button", { name: "やったね" }).click();
  await expect(page.getByTestId("cat-level")).toHaveText("2");
  await expect(page.getByTestId("xp-value")).toHaveText("15 / 40 XP");
  await expect(page.getByTestId("fullness-value")).toHaveText("90%");

  // リロードしても状態が残る
  await page.reload();
  await expect(page.getByTestId("cat-name")).toHaveText("たま");
  await expect(page.getByTestId("cat-level")).toHaveText("2");
  await expect(page.getByTestId("count-feast")).toHaveText("0");
  await expect(page.getByTestId("count-kibble")).toHaveText("1");
});

test("タスクの追加・編集・完了・戻す・削除", async ({ page }) => {
  await start(page);
  await nav(page, "タスク").click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByText("タスクは まだありません")).toBeVisible();

  // 空のタイトルは保存できない
  await page.getByRole("button", { name: "タスクを追加" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "追加する" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("タスク名を入力してください");
  await page.getByRole("dialog").getByRole("button", { name: "やめる" }).click();

  await addTask(page, "かいもの", "easy");
  await addTask(page, "そうじ", "normal");
  await expect(page.getByTestId("task-item")).toHaveCount(2);

  // 編集
  await page.getByRole("button", { name: "「かいもの」を編集" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[name="title"]').fill("スーパーで買い物");
  await dialog.locator('textarea[name="memo"]').fill("牛乳とたまご");
  await dialog.getByRole("button", { name: "保存する" }).click();
  await expect(page.getByText("スーパーで買い物")).toBeVisible();
  await expect(page.getByText("牛乳とたまご")).toBeVisible();

  // 完了 → 「すべて」には残り、「未完了」「完了」で絞り込める
  await page.getByRole("button", { name: "「スーパーで買い物」を完了にする" }).click();
  await expect(page.getByTestId("task-item")).toHaveCount(2);
  await page.getByRole("tab", { name: /^未完了/ }).click();
  await expect(page.getByTestId("task-item")).toHaveCount(1);
  await page.getByRole("tab", { name: /^完了/ }).click();
  await expect(page.getByTestId("task-item")).toHaveCount(1);
  await expect(page.getByText("スーパーで買い物")).toBeVisible();

  // 戻して再完了しても、ごほうびは増えない
  await page.getByRole("button", { name: "「スーパーで買い物」を未完了に戻す" }).click();
  await page.getByRole("tab", { name: /^未完了/ }).click();
  await page.getByRole("button", { name: "「スーパーで買い物」を完了にする" }).click();
  await expect(page.getByRole("status")).toContainText("ごほうびは受け取り済み");

  // 削除（確認ダイアログあり）
  await page.getByRole("button", { name: "「そうじ」を削除" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "やめる" }).click();
  await expect(page.getByText("そうじ", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "「そうじ」を削除" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "削除する" }).click();
  await expect(page.getByTestId("task-item")).toHaveCount(0);
  await page.getByRole("tab", { name: /^すべて/ }).click();
  await expect(page.getByTestId("task-item")).toHaveCount(1);

  // ホームに戻ると カリカリは 初期1 + 報酬1 = 2（二重取りなし）
  await nav(page, "ホーム").click();
  await expect(page.getByTestId("count-kibble")).toHaveText("2");

  // リロード後も保持
  await page.reload();
  await expect(page.getByTestId("count-kibble")).toHaveText("2");
  await nav(page, "タスク").click();
  await page.getByRole("tab", { name: /^完了/ }).click();
  await expect(page.getByText("スーパーで買い物")).toBeVisible();
});

test("きろくに履歴が残り、せっていで名前変更とリセットができる", async ({ page }) => {
  await start(page);
  await page.getByTestId("feed-kibble").click();
  await expect(page.getByTestId("xp-value")).toHaveText("10 / 20 XP");
  await expect(page.getByTestId("affection-value")).toHaveText("2%");
  const moodBefore = parseInt(await page.getByTestId("mood-value").innerText(), 10);
  await page.getByRole("button", { name: "たまをなでる" }).click();
  // なでると なつき度ときげんが上がる
  await expect(page.getByTestId("affection-value")).toHaveText("3%");
  await expect.poll(async () => parseInt(await page.getByTestId("mood-value").innerText(), 10)).toBeGreaterThan(moodBefore);

  await nav(page, "きろく").click();
  await expect(page.getByText("たまに カリカリ をあげた")).toBeVisible();
  await expect(page.locator(".album__item.is-current")).toContainText("こねこ");
  await expect(page.locator(".album__item.is-locked")).toHaveCount(3);

  await nav(page, "せってい").click();
  await page.getByLabel("ねこの なまえ").fill("とら");
  await page.getByRole("button", { name: "変更する" }).click();
  await nav(page, "ホーム").click();
  await expect(page.getByTestId("cat-name")).toHaveText("とら");

  await nav(page, "せってい").click();
  await page.getByRole("button", { name: "すべてのデータを消す" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "すべて消す" }).click();
  // リセット後は初回起動と同じ状態に戻る
  const onboarding = page.getByRole("dialog").locator('input[name="catName"]');
  await expect(onboarding).toBeVisible();
  await expect(onboarding).toHaveValue("");
});

test("バックアップの保存と復元", async ({ page }) => {
  await start(page);
  await addTask(page, "バックアップ対象のタスク", "normal");
  await nav(page, "せってい").click();

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "ファイルに保存する" }).click()]);
  const path = await download.path();
  expect(download.suggestedFilename()).toMatch(/^gohobi-neko-\d{4}-\d{2}-\d{2}\.json$/);

  // 壊れたファイルは拒否される
  await page.getByTestId("import-file").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"app":"x"}') });
  await expect(page.getByRole("status")).toContainText("バックアップを読み込めません");

  await page.getByRole("button", { name: "すべてのデータを消す" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "すべて消す" }).click();
  await page.getByRole("dialog").locator('input[name="catName"]').fill("べつのねこ");
  await page.getByRole("button", { name: "いっしょに はじめる" }).click();

  await page.getByTestId("import-file").setInputFiles(path);
  await page.getByRole("dialog").getByRole("button", { name: "復元する" }).click();
  await expect(page.getByLabel("ねこの なまえ")).toHaveValue("たま");
  await nav(page, "タスク").click();
  await expect(page.getByText("バックアップ対象のタスク")).toBeVisible();
});

test("横スクロールが発生しない", async ({ page }) => {
  await start(page);
  await addTask(page, "とても長いタスク名".repeat(6).slice(0, 60), "hard");
  for (const path of ["/", "/tasks", "/records", "/settings"]) {
    await page.goto(path);
    await expect(page.locator("main .card").first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} が横にはみ出している`).toBeLessThanOrEqual(0);
  }
});
