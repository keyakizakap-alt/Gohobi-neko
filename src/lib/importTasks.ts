/**
 * タスクの取り込み（純粋関数）。
 * プラグイン（AI）が出力した JSON と、1行1タスクのテキストの両方を読める。
 *
 * JSON の形式（どちらでもよい）：
 *   { "app": "gohobi-neko", "type": "tasks", "tasks": [ { "title": "...", "memo": "...", "difficulty": "easy|normal|hard", "dueDate": "YYYY-MM-DD" } ] }
 *   [ { "title": "..." }, ... ]
 */
import { DIFFICULTIES, GameError, MEMO_MAX, TITLE_MAX, isValidDateKey, stripControl, toDateKey } from "./game";
import type { Difficulty, TaskInput } from "./types";

export const IMPORT_TEXT_MAX = 50_000;
export const IMPORT_MAX_TASKS = 100;

export interface ImportResult {
  tasks: TaskInput[];
  /** 読み飛ばした行・項目の説明 */
  skipped: string[];
  format: "json" | "text";
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** AI がよく付ける ```json ～ ``` の囲みや前後の説明文を取り除き、JSON 部分だけを返す */
function extractJson(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? text).trim();
  if (body.startsWith("{") || body.startsWith("[")) return body;
  return null;
}

function cleanTitle(raw: string): string {
  return stripControl(raw).replace(/\s+/g, " ").trim().slice(0, TITLE_MAX);
}

function toDifficulty(v: unknown): Difficulty {
  if (typeof v === "string") {
    if (v in DIFFICULTIES) return v as Difficulty;
    if (/かんたん|簡単|easy|小/.test(v)) return "easy";
    if (/たいへん|大変|むずかしい|難|hard|大/.test(v)) return "hard";
  }
  return "normal";
}

/**
 * 月と日から、今日以降でいちばん近い日付を作る（過去30日以内なら今年＝期限切れとして扱う）
 */
function nearestDate(month: number, day: number, now: number): string | null {
  const today = new Date(now);
  for (const y of [today.getFullYear(), today.getFullYear() + 1]) {
    const key = `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (!isValidDateKey(key)) return null;
    const diff = (new Date(y, month - 1, day).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000;
    if (diff >= -30) return key;
  }
  return null;
}

const WEEKDAYS = "日月火水木金土";

/** 文中の期限らしき表現を探して日付にする。見つかった部分を取り除いたタイトルも返す */
export function findDueDate(text: string, now: number): { dueDate: string | null; rest: string } {
  const base = new Date(now);
  base.setHours(12, 0, 0, 0);
  const add = (days: number) => toDateKey(base.getTime() + days * 86_400_000);
  const rules: [RegExp, (m: RegExpMatchArray) => string | null][] = [
    [/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/, (m) => {
      const key = `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
      return isValidDateKey(key) ? key : null;
    }],
    [/(\d{1,2})\s*[/月]\s*(\d{1,2})\s*日?/, (m) => nearestDate(Number(m[1]), Number(m[2]), now)],
    [/今日|本日|きょう/, () => add(0)],
    [/明後日|あさって/, () => add(2)],
    [/明日|あした|あす/, () => add(1)],
    [/来週/, () => add(7)],
    [/([日月火水木金土])曜(?:日)?/, (m) => {
      const target = WEEKDAYS.indexOf(m[1]!);
      const diff = (target - base.getDay() + 7) % 7 || 7;
      return add(diff);
    }],
  ];
  for (const [re, fn] of rules) {
    const m = text.match(re);
    if (!m) continue;
    const dueDate = fn(m);
    if (!dueDate) continue;
    // 「〜まで」「〜までに」「（〜）」もいっしょに取り除く
    const rest = text
      .replace(new RegExp(`[（(\\[【]?\\s*${m[0].replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}\\s*(?:まで(?:に)?|〆|締め切り|締切|期限)?\\s*[）)\\]】]?`), " ")
      .replace(/\s+/g, " ")
      .trim();
    return { dueDate, rest };
  }
  return { dueDate: null, rest: text };
}

function fromJson(data: unknown, skipped: string[]): TaskInput[] {
  const list = Array.isArray(data) ? data : isObj(data) && Array.isArray(data.tasks) ? data.tasks : null;
  if (!list) throw new GameError("INVALID", "タスクの一覧が見つかりません（tasks の配列が必要です）");
  const out: TaskInput[] = [];
  list.forEach((item, i) => {
    const raw = typeof item === "string" ? { title: item } : item;
    if (!isObj(raw) || typeof raw.title !== "string") {
      skipped.push(`${i + 1}件目：タスク名がありません`);
      return;
    }
    const title = cleanTitle(raw.title);
    if (!title) {
      skipped.push(`${i + 1}件目：タスク名が空です`);
      return;
    }
    const due = typeof raw.dueDate === "string" ? raw.dueDate.trim() : "";
    out.push({
      title,
      memo: typeof raw.memo === "string" ? stripControl(raw.memo, true).trim().slice(0, MEMO_MAX) : "",
      difficulty: toDifficulty(raw.difficulty),
      dueDate: isValidDateKey(due) ? due : null,
    });
    if (due && !isValidDateKey(due)) skipped.push(`「${title}」：期限「${due.slice(0, 20)}」を読めないため、期限なしにしました`);
  });
  return out;
}

/** 箇条書きの記号・チェックボックス・番号を取り除く */
const BULLET = /^\s*(?:[-*・●○◯◆◇■□☐☑✓✔▶►→]|\[\s?[xX ]?\s?\]|\(\s?\)|（\s?）|\d{1,3}[.)）、]|[①-⑳])\s*/;

function fromText(text: string, now: number, skipped: string[]): TaskInput[] {
  const out: TaskInput[] = [];
  for (const line of text.split(/\r?\n/)) {
    let s = line.trim();
    if (!s) continue;
    // 見出しや区切り線は飛ばす
    if (/^#{1,6}\s|^[-=_*]{3,}$/.test(s)) continue;
    // 完了済みの印（[x] や ☑ ✓）は取り込まない
    if (/^\s*(?:[-*]\s*)?(?:\[[xX]\]|☑|✓|✔)/.test(s)) {
      skipped.push(`「${s.slice(0, 30)}」：完了済みの印があるため飛ばしました`);
      continue;
    }
    let prev = "";
    while (prev !== s) {
      prev = s;
      s = s.replace(BULLET, "");
    }
    const { dueDate, rest } = findDueDate(s, now);
    const title = cleanTitle(rest);
    if (!title) continue;
    out.push({ title, memo: "", difficulty: "normal", dueDate });
  }
  return out;
}

/** 貼り付けられた文字列を読み取る。読めなければ GameError(INVALID) */
export function parseImportText(text: string, now = Date.now()): ImportResult {
  if (text.length > IMPORT_TEXT_MAX) throw new GameError("INVALID", `文字数が多すぎます（${IMPORT_TEXT_MAX.toLocaleString()}文字まで）`);
  const skipped: string[] = [];
  const json = extractJson(text);
  let tasks: TaskInput[];
  let format: ImportResult["format"];
  if (json !== null) {
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch {
      throw new GameError("INVALID", "JSON の形式が正しくありません");
    }
    tasks = fromJson(data, skipped);
    format = "json";
  } else {
    tasks = fromText(text, now, skipped);
    format = "text";
  }
  if (tasks.length === 0) throw new GameError("INVALID", "取り込めるタスクが見つかりませんでした");
  if (tasks.length > IMPORT_MAX_TASKS) {
    skipped.push(`${IMPORT_MAX_TASKS}件を超えた${tasks.length - IMPORT_MAX_TASKS}件は読み込みませんでした`);
    tasks = tasks.slice(0, IMPORT_MAX_TASKS);
  }
  return { tasks, skipped, format };
}
