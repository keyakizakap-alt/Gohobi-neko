// README 用スクリーンショットを撮る。先に `npm run build && npm run start -- -p 3100` を起動しておくこと。
//   node scripts/screenshots.mjs [baseURL]
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = process.argv[2] ?? "http://localhost:3100";
const out = new URL("../docs/screenshots/", import.meta.url).pathname;
await mkdir(out, { recursive: true });

// 部屋の見た目が時刻で変わるので、撮影は「今日の10:30」に固定する
const now = new Date().setHours(10, 30, 0, 0);
const DAY = 86_400_000;
const task = (id, title, difficulty, extra = {}) => ({
  id, title, memo: "", difficulty, dueDate: null, status: "todo", rewardClaimed: false,
  createdAt: now - 1000 * Number(id.slice(1)), updatedAt: now, completedAt: null, ...extra,
});
const day = (offset) => {
  const d = new Date(now + offset * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
/** 見た目確認用のバックアップデータを作る */
const backup = ({ xp, fullness, inventory }) => ({
  app: "gohobi-neko", schemaVersion: 1, exportedAt: now,
  state: {
    id: "main", schemaVersion: 1, onboarded: true, inventory,
    cat: { name: "たま", xp, fullness, fullnessAt: now, petCount: 42, totalFeeds: 37, bornAt: now - 20 * DAY },
  },
  tasks: [
    task("t1", "企画書の下書きを仕上げる", "hard", { dueDate: day(0), memo: "構成→本文→図の順で" }),
    task("t2", "メールに返信する", "easy"),
    task("t3", "30分ウォーキング", "normal", { dueDate: day(1) }),
    task("t4", "部屋のそうじ", "normal", { dueDate: day(-1) }),
    task("t5", "洗濯物をたたむ", "easy", { status: "done", rewardClaimed: true, completedAt: now - 3600_000 }),
    task("t6", "本を20ページ読む", "normal", { status: "done", rewardClaimed: true, completedAt: now - DAY }),
    task("t7", "確定申告の準備", "hard", { status: "done", rewardClaimed: true, completedAt: now - 2 * DAY }),
  ],
  events: [
    { type: "reward", at: now - 2 * DAY, foodId: "feast", taskTitle: "確定申告の準備" },
    { type: "feed", at: now - 2 * DAY + 60_000, foodId: "feast" },
    { type: "reward", at: now - DAY, foodId: "fish", taskTitle: "本を20ページ読む" },
    { type: "feed", at: now - DAY + 60_000, foodId: "fish" },
    { type: "levelup", at: now - DAY + 60_000, level: 5 },
    { type: "evolve", at: now - DAY + 60_000, stage: "young", level: 5 },
    { type: "reward", at: now - 3600_000, foodId: "kibble", taskTitle: "洗濯物をたたむ" },
  ],
});

async function load(page, data) {
  await page.goto(`${base}/settings`);
  const first = page.getByRole("dialog").locator('input[name="catName"]');
  if (await first.isVisible().catch(() => false)) {
    await first.fill("たま");
    await page.getByRole("button", { name: "いっしょに はじめる" }).click();
  }
  await page.getByTestId("import-file").setInputFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(data)) });
  await page.getByRole("dialog").getByRole("button", { name: "復元する" }).click();
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  await page.waitForTimeout(3400); // トーストが消えるのを待つ
}

const browser = await chromium.launch();
for (const [device, viewport] of [["mobile", { width: 390, height: 844 }], ["tablet", { width: 820, height: 1180 }], ["desktop", { width: 1440, height: 900 }]]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, reducedMotion: "no-preference" });
  await ctx.clock.install({ time: now });
  const page = await ctx.newPage();
  await page.goto(base);
  await page.locator('input[name="catName"]').waitFor();
  if (device !== "tablet") await page.screenshot({ path: `${out}${device}-onboarding.png` });

  await load(page, backup({ xp: 232, fullness: 62, inventory: { kibble: 3, fish: 2, feast: 1 } }));
  await page.goto(base);
  await page.getByTestId("cat-name").waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}${device}-home.png` });
  if (device === "mobile") {
    // 下部ナビが固定表示なので、続きはスクロールして撮る
    await page.locator(".taskcard").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}${device}-home-2.png` });
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  if (device !== "tablet") {
    await page.getByTestId("feed-fish").click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}${device}-feeding.png` });
    await page.waitForTimeout(1200);
    for (const [path, name, sel] of [["/tasks", "tasks", ".filters"], ["/records", "records", ".album"], ["/settings", "settings", ".card--danger"]]) {
      await page.goto(base + path);
      await page.locator(sel).waitFor();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}${device}-${name}.png`, fullPage: true });
    }
    await page.goto(`${base}/tasks`);
    await page.getByRole("button", { name: "タスクを追加" }).first().click();
    await page.getByRole("dialog").locator('input[name="title"]').fill("ジムに行く");
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}${device}-task-dialog.png` });
    await page.keyboard.press("Escape");

    // 進化の瞬間（Lv9 → Lv10 おとなねこ）
    await load(page, backup({ xp: 890, fullness: 70, inventory: { kibble: 1, fish: 0, feast: 0 } }));
    await page.goto(base);
    await page.getByTestId("feed-kibble").click();
    await page.getByTestId("levelup-level").waitFor();
    await page.waitForTimeout(2600); // 進化の演出が終わるまで待つ
    await page.screenshot({ path: `${out}${device}-evolve.png` });
    await page.getByRole("button", { name: "やったね" }).click();

    // さいごの姿・おなかぺこぺこ
    await load(page, backup({ xp: 2300, fullness: 8, inventory: { kibble: 0, fish: 0, feast: 0 } }));
    await page.goto(base);
    await page.getByTestId("cat-name").waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}${device}-master-hungry.png` });
  }
  await ctx.close();
}
await browser.close();
console.log("saved to", out);
