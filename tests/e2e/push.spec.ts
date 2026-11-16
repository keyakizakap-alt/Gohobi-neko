import { expect, test, type Page } from "@playwright/test";

const CRON = { Authorization: "Bearer e2e-cron-secret" };

/** ヘッドレス Chromium の通知許可の癖と、プッシュサービスへの購読を、テスト用に差し替える */
async function fakePush(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(Notification, "permission", { get: () => "granted", configurable: true });
    Notification.requestPermission = async () => "granted";
    // 本物の購読はページを移動しても残るので、偽物も localStorage に置いて引き継ぐ
    const KEY = "__e2e_sub";
    const make = (endpoint: string) => ({
      endpoint,
      toJSON() {
        return { endpoint, keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } };
      },
      async unsubscribe() {
        localStorage.removeItem(KEY);
        localStorage.setItem("__e2e_unsub", String(Number(localStorage.getItem("__e2e_unsub") ?? 0) + 1));
        return true;
      },
    });
    PushManager.prototype.getSubscription = async function () {
      const e = localStorage.getItem(KEY);
      return (e ? make(e) : null) as PushSubscription | null;
    };
    PushManager.prototype.subscribe = async function () {
      const e = "https://fcm.googleapis.com/fcm/send/e2e-" + Math.random().toString(36).slice(2);
      localStorage.setItem(KEY, e);
      return make(e) as unknown as PushSubscription;
    };
    ServiceWorkerRegistration.prototype.showNotification = async function () {};
  });
}

async function start(page: Page) {
  await page.goto("/");
  await page.locator('input[name="catName"]').fill("たま");
  await page.getByRole("button", { name: "いっしょに はじめる" }).click();
  await expect(page.getByTestId("cat-name")).toHaveText("たま");
}

async function addDueToday(page: Page, title: string) {
  const d = new Date();
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  await page.getByRole("button", { name: /追加/ }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[name="title"]').fill(title);
  await dialog.locator('input[name="dueDate"]').fill(key);
  await dialog.getByRole("button", { name: "追加する" }).click();
  await expect(dialog).toBeHidden();
}

test("プッシュ通知：登録すると、サーバーの定期実行から1回だけ届き、オフで登録が消える", async ({ page, request }) => {
  // ほかのテストの登録と混ざらないよう、このテストは1つずつ実行する
  test.skip(test.info().project.name !== "desktop", "サーバーの状態を共有するため、PC幅だけで実行する");
  await fakePush(page);
  await start(page);
  expect((await (await request.get("/api/push/config")).json()).enabled).toBe(true);

  await addDueToday(page, "プッシュの確認タスク");
  await page.goto("/settings");
  await page.getByText("通知する").click();
  await expect(page.getByTestId("push-status")).toContainText("アプリを閉じていても届きます");

  // サーバーの定期実行（1日1回の呼び出し）。鍵なしは拒否される
  expect((await request.get("/api/push/daily")).status()).toBe(401);
  const first = await (await request.get("/api/push/daily", { headers: CRON })).json();
  expect(first.sent).toBeGreaterThanOrEqual(1);
  const mine = first.preview.find((p: { body: string }) => p.body.includes("プッシュの確認タスク"));
  expect(mine.title).toMatch(/今日までのタスクが\d+件あるにゃ/);
  // 2回目は同じ通知を送らない
  const second = await (await request.get("/api/push/daily", { headers: CRON })).json();
  expect(second.preview.some((p: { body: string }) => p.body.includes("プッシュの確認タスク"))).toBe(false);

  // タスク名を出さない設定にすると、サーバーにも名前を送らない
  await page.getByText("通知にタスク名を表示する").click();
  await expect(page.getByTestId("notify-titles")).not.toBeChecked();
  await page.goto("/");
  await addDueToday(page, "名前を出さないタスク");
  await page.waitForTimeout(2500); // 同期は1.5秒待ってから送る
  const third = await (await request.get("/api/push/daily", { headers: CRON })).json();
  const hidden = third.preview.find((p: { body: string }) => p.body.includes("たまにごはん"));
  expect(hidden).toBeTruthy();
  expect(third.preview.some((p: { body: string }) => p.body.includes("名前を出さないタスク"))).toBe(false);

  // 通知をオフにすると、購読を解除し、サーバーの登録も消える
  await page.goto("/settings");
  await page.getByText("通知する", { exact: true }).click();
  await expect(page.getByTestId("notify-toggle")).not.toBeChecked();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("__e2e_unsub")), { timeout: 10_000 }).toBe("1");
  await page.goto("/");
  await addDueToday(page, "オフにしたあとのタスク");
  await page.waitForTimeout(2500);
  const after = await (await request.get("/api/push/daily", { headers: CRON })).json();
  expect(after.preview.some((p: { body: string }) => p.body.includes("オフにしたあと"))).toBe(false);
});

test("プッシュ通知のAPIは、別サイトからの呼び出しと不正な送信先を拒否する", async ({ request, baseURL }) => {
  const body = {
    id: "e2e-evil", secret: "s".repeat(40), timeZone: "Asia/Tokyo", hour: 9, catName: "x", items: [],
    subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: { p256dh: "BNcR", auth: "tBHI" } },
  };
  expect((await request.put("/api/push/device", { data: body, headers: { Origin: "https://evil.example" } })).status()).toBe(403);
  const ssrf = { ...body, subscription: { ...body.subscription, endpoint: "http://169.254.169.254/latest" } };
  expect((await request.put("/api/push/device", { data: ssrf, headers: { Origin: baseURL! } })).status()).toBe(400);
  expect((await request.get("/api/push/cron", { headers: { Authorization: "Bearer wrong" } })).status()).toBe(401);
});
