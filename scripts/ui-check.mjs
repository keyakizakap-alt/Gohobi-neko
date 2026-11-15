// 10種類の画面幅で全画面を撮影し、横はみ出し・画面外・文字切れ・カードの重なりを機械的に検出する。
// 先に `npm run build && npm run start -- -p 3100` を起動し、`node scripts/ui-check.mjs <出力フォルダ>` で実行する。
import { chromium } from "@playwright/test";
const out = process.argv[2]; const B = "http://localhost:3100";
const now = new Date().setHours(10, 30, 0, 0); const DAY = 864e5;
const day = (o) => { const d = new Date(now + o * DAY); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const task = (id, title, difficulty, extra = {}) => ({ id, title, memo: "", difficulty, dueDate: null, status: "todo", rewardClaimed: false, createdAt: now - 1000 * Number(id.slice(1)), updatedAt: now, completedAt: null, ...extra });
const data = (xp, name = "たま") => ({ app: "gohobi-neko", schemaVersion: 1, exportedAt: now,
  state: { id: "main", schemaVersion: 1, onboarded: true, inventory: { kibble: 12, fish: 3, feast: 1 }, cat: { name, xp, fullness: 62, fullnessAt: now, petCount: 42, totalFeeds: 37, bornAt: now - 20 * DAY } },
  tasks: [
    task("t1", "来週の定例会議で使う四半期レポートの下書きを仕上げてチームに共有する", "hard", { dueDate: day(0), memo: "構成→本文→図の順で。レビュー依頼も忘れずに送ること" }),
    task("t2", "メールに返信する", "easy"), task("t3", "30分ウォーキング", "normal", { dueDate: day(1) }),
    task("t4", "部屋のそうじ", "normal", { dueDate: day(-1) }),
    task("t5", "Supercalifragilisticexpialidocious-and-a-long-unbroken-word", "easy", { dueDate: day(3) }),
    task("t6", "洗濯物をたたむ", "easy", { status: "done", rewardClaimed: true, completedAt: now - 36e5 }),
    task("t7", "本を20ページ読む", "normal", { status: "done", rewardClaimed: true, completedAt: now - DAY }),
  ],
  events: [{ type: "reward", at: now - DAY, foodId: "fish", taskTitle: "来週の定例会議で使う四半期レポートの下書きを仕上げてチームに共有する" }, { type: "feed", at: now - DAY + 6e4, foodId: "fish" }, { type: "evolve", at: now - DAY + 6e4, stage: "young", level: 5 }, { type: "reward", at: now - 36e5, foodId: "kibble", taskTitle: "洗濯物をたたむ" }] });
const b = await chromium.launch();
const report = [];
for (const w of [320, 360, 390, 430, 600, 768, 900, 1024, 1280, 1920]) {
  const h = w < 600 ? 740 : w < 1100 ? 1024 : 900;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.clock.install({ time: now });
  const p = await ctx.newPage();
  await p.goto(B + "/settings");
  await p.locator('input[name="catName"]').first().fill("たま");
  await p.getByRole("button", { name: "いっしょに はじめる" }).click();
  await p.getByTestId("import-file").setInputFiles({ name: "b.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(data(w % 3 === 0 ? 2300 : w % 3 === 1 ? 950 : 232, w === 320 ? "ながいなまえのねこちゃん" : "たま"))) });
  await p.getByRole("dialog").getByRole("button", { name: "復元する" }).click();
  await p.waitForFunction(() => !document.querySelector("dialog[open]"));
  await p.waitForTimeout(3300);
  for (const [path, name] of [["/", "home"], ["/tasks", "tasks"], ["/records", "records"], ["/settings", "settings"]]) {
    await p.goto(B + path); await p.waitForSelector("main .card"); await p.waitForTimeout(350);
    await p.screenshot({ path: `${out}/${String(w).padStart(4, "0")}-${name}.png`, fullPage: true });
    // 機械的な検出：はみ出し・重なり・切れた文字
    const issues = await p.evaluate(() => {
      const res = []; const vw = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > vw) res.push("横スクロール " + document.documentElement.scrollWidth);
      for (const el of document.querySelectorAll("main *, nav *")) {
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
        const cs = getComputedStyle(el); if (cs.position === "fixed" || cs.visibility === "hidden") continue;
        if (el.closest(".room, .nav__art, .cat, svg, .levelup__confetti")) continue;
        if (r.right > vw + 1 || r.left < -1) res.push(`画面外 ${el.className || el.tagName} ${Math.round(r.left)}..${Math.round(r.right)}`);
        if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && cs.overflow !== "visible") res.push(`文字切れ ${el.className || el.tagName} "${(el.textContent || "").slice(0, 16)}"`);
      }
      // 兄弟カード同士の重なり
      const cards = [...document.querySelectorAll("main .card, main .stat, main .food, main .task")];
      for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
        const a = cards[i], c = cards[j]; if (a.contains(c) || c.contains(a)) continue;
        const x = a.getBoundingClientRect(), y = c.getBoundingClientRect();
        const ox = Math.min(x.right, y.right) - Math.max(x.left, y.left), oy = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
        if (ox > 4 && oy > 4) res.push(`重なり ${a.className.split(" ")[1] || a.className} × ${c.className.split(" ")[1] || c.className} ${Math.round(ox)}x${Math.round(oy)}`);
      }
      return [...new Set(res)].slice(0, 8);
    });
    if (issues.length) report.push(`${w} ${name}: ${issues.join(" | ")}`);
  }
  if ([320, 390, 768, 1280].includes(w)) {
    await p.goto(B + "/tasks"); await p.getByRole("button", { name: "タスクを追加" }).first().click(); await p.waitForTimeout(350);
    await p.screenshot({ path: `${out}/${String(w).padStart(4, "0")}-dialog.png` }); await p.keyboard.press("Escape");
    await p.locator(".task .icon-btn--danger").first().click(); await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/${String(w).padStart(4, "0")}-confirm.png` });
  }
  await ctx.close();
}
await b.close();
console.log(report.join("\n") || "機械検出：問題なし");
