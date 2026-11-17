import { expect, test, type Page } from "@playwright/test";

async function start(page: Page, name = "たま") {
  await page.goto("/");
  await page.locator('input[name="catName"]').fill(name);
  await page.getByRole("button", { name: "いっしょに はじめる" }).click();
  await expect(page.getByTestId("cat-name")).toHaveText(name);
}

test("もようがえ：壁紙と床を変え、家具をしまい、未解放は選べない", async ({ page }) => {
  await start(page);
  await page.getByRole("link", { name: "もようがえ" }).click();
  await expect(page).toHaveURL(/\/room$/);
  await expect(page.getByRole("heading", { name: "もようがえ" })).toBeVisible();
  await expect(page.getByText(/つぎは Lv\.2 で/)).toBeVisible();

  // 壁紙
  const mint = page.getByRole("button", { name: "ミントのストライプ" });
  await mint.click();
  await expect(mint).toHaveAttribute("aria-pressed", "true");

  // 未解放
  const locked = page.getByRole("button", { name: /（Lv\.3で解放）/ }).first();
  await locked.click();
  await expect(page.getByText("Lv.3になると選べるようになります")).toBeVisible();
  await expect(locked).toHaveAttribute("aria-pressed", "false");

  // 床
  await page.getByRole("tab", { name: "床" }).click();
  const floors = page.locator(".deco__opt:not(.is-locked)");
  await expect(floors.first()).toHaveAttribute("aria-pressed", "true");

  // 家具をしまう
  await page.getByRole("tab", { name: "家具" }).click();
  const plantSlot = page.locator(".deco__slot").filter({ has: page.getByRole("heading", { name: "つりさげ鉢" }) });
  await plantSlot.getByRole("button", { name: "なし" }).click();
  await expect(plantSlot.getByRole("button", { name: "なし" })).toHaveAttribute("aria-pressed", "true");

  // 再読み込みしても残り、ホームの部屋にも反映される
  await page.reload();
  await expect(page.getByRole("button", { name: "ミントのストライプ" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/");
  await expect(page.locator(".room .room__plant")).toHaveCount(0);

  // はじめにもどす
  await page.goto("/room");
  await page.getByRole("button", { name: "はじめの部屋にもどす" }).click();
  await expect(page.getByRole("button", { name: WALLS_DEFAULT })).toHaveAttribute("aria-pressed", "true");
});

const WALLS_DEFAULT = /クリーム/;

test("せっていからも、もようがえを開ける", async ({ page }) => {
  await start(page);
  await page.goto("/settings");
  await page.getByRole("link", { name: "もようがえする" }).click();
  await expect(page).toHaveURL(/\/room$/);
  await expect(page.getByRole("heading", { name: "もようがえ" })).toBeVisible();
});

test("表情：期限切れがあると ご機嫌ななめ、終えると元に戻る", async ({ page }) => {
  await start(page);
  const d = new Date(Date.now() - 2 * 86_400_000);
  const past = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  await page.getByRole("button", { name: /追加/ }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[name="title"]').fill("出しわすれた書類");
  await dialog.locator('input[name="dueDate"]').fill(past);
  await dialog.getByRole("button", { name: "追加する" }).click();
  await expect(dialog).toBeHidden();

  await page.goto("/");
  await expect(page.locator(".room .cat--grumpy")).toBeVisible();
  await expect(page.getByText("期限が過ぎたタスクが1件あるにゃ…むすっ")).toBeVisible();

  await page.goto("/tasks");
  await page.getByRole("button", { name: "「出しわすれた書類」を完了にする" }).click();
  await expect(page.locator(".task--done")).toHaveCount(1);
  await page.goto("/");
  await expect(page.locator(".room .cat--grumpy")).toHaveCount(0);
});

test("表情：ホームでタスクを終えると、ねこが大よろこびする", async ({ page }) => {
  await start(page);
  await page.getByRole("button", { name: /追加/ }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[name="title"]').fill("洗濯物をたたむ");
  await dialog.getByRole("button", { name: "追加する" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "「洗濯物をたたむ」を完了にする" }).click();
  await expect(page.locator(".room .cat--joy")).toBeVisible();
});
