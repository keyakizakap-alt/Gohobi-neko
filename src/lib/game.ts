/**
 * ゲームルール（純粋関数のみ）。副作用を持たないので単体テストしやすい。
 */
import type {
  CatState,
  Difficulty,
  FeedOutcome,
  FoodId,
  GameState,
  Inventory,
  StageId,
  TaskInput,
} from "./types";

export const SCHEMA_VERSION = 1;
export const TITLE_MAX = 60;
export const MEMO_MAX = 200;
export const NAME_MAX = 12;
/** 1時間あたりに減る満腹度 */
export const FULLNESS_DECAY_PER_HOUR = 3;

export class GameError extends Error {
  constructor(
    public readonly code: "NO_FOOD" | "NOT_FOUND" | "INVALID" | "STORAGE",
    message: string,
  ) {
    super(message);
    this.name = "GameError";
  }
}

export interface FoodDef {
  id: FoodId;
  name: string;
  xp: number;
  fullness: number;
  description: string;
}

export const FOODS: Record<FoodId, FoodDef> = {
  kibble: { id: "kibble", name: "カリカリ", xp: 10, fullness: 15, description: "いつものごはん" },
  fish: { id: "fish", name: "おさかな", xp: 20, fullness: 25, description: "ちょっといいごはん" },
  feast: { id: "feast", name: "ごちそう缶", xp: 35, fullness: 40, description: "とっておきのごちそう" },
};
export const FOOD_IDS: FoodId[] = ["kibble", "fish", "feast"];

export interface DifficultyDef {
  id: Difficulty;
  label: string;
  hint: string;
  food: FoodId;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy: { id: "easy", label: "かんたん", hint: "5分くらい", food: "kibble" },
  normal: { id: "normal", label: "ふつう", hint: "30分くらい", food: "fish" },
  hard: { id: "hard", label: "たいへん", hint: "がんばった！", food: "feast" },
};
export const DIFFICULTY_IDS: Difficulty[] = ["easy", "normal", "hard"];

export interface StageDef {
  id: StageId;
  name: string;
  minLevel: number;
  description: string;
}

export const STAGES: StageDef[] = [
  { id: "kitten", name: "こねこ", minLevel: 1, description: "うちに来たばかりの、ちいさなこねこ。" },
  { id: "young", name: "わかねこ", minLevel: 5, description: "鈴つきの首輪をもらって、ごきげん。" },
  { id: "adult", name: "おとなねこ", minLevel: 10, description: "リボンが似合う、たのもしい相棒。" },
  { id: "master", name: "ねこさま", minLevel: 15, description: "王冠をいただく、でんせつのねこ。" },
];

/** そのレベルに到達するために必要な累計XP（Lv1=0, Lv2=20, Lv3=60, Lv5=200, Lv10=900, Lv15=2100） */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 10 * l * (l - 1);
}

export function levelFromXp(xp: number): number {
  const safe = Math.max(0, xp);
  let level = 1;
  while (xpForLevel(level + 1) <= safe) level++;
  return level;
}

export interface LevelProgress {
  level: number;
  /** 現レベル内で貯めたXP */
  current: number;
  /** 次レベルまでに必要なXP幅 */
  needed: number;
  ratio: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const needed = xpForLevel(level + 1) - base;
  const current = Math.max(0, xp) - base;
  return { level, current, needed, ratio: Math.min(1, current / needed) };
}

export function stageForLevel(level: number): StageDef {
  let found = STAGES[0]!;
  for (const s of STAGES) if (level >= s.minLevel) found = s;
  return found;
}

export function nextStage(level: number): StageDef | null {
  return STAGES.find((s) => s.minLevel > level) ?? null;
}

/** 経過時間ぶん減衰させた現在の満腹度 */
export function currentFullness(cat: Pick<CatState, "fullness" | "fullnessAt">, now: number): number {
  const hours = Math.max(0, now - cat.fullnessAt) / 3_600_000;
  const v = cat.fullness - hours * FULLNESS_DECAY_PER_HOUR;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export type Mood = "hungry" | "normal" | "happy";

export function moodOf(fullness: number): Mood {
  if (fullness < 30) return "hungry";
  if (fullness >= 70) return "happy";
  return "normal";
}

export function emptyInventory(): Inventory {
  return { kibble: 0, fish: 0, feast: 0 };
}

export function createInitialState(now: number): GameState {
  return {
    id: "main",
    schemaVersion: SCHEMA_VERSION,
    onboarded: false,
    cat: {
      name: "ねこ",
      xp: 0,
      fullness: 50,
      fullnessAt: now,
      petCount: 0,
      totalFeeds: 0,
      bornAt: now,
    },
    // はじめての「エサやり」をすぐ体験できるよう、カリカリを1つプレゼント
    inventory: { kibble: 1, fish: 0, feast: 0 },
  };
}

export function rewardFor(difficulty: Difficulty): FoodId {
  return DIFFICULTIES[difficulty].food;
}

/** タスク完了の報酬を在庫に加えた新しい状態を返す */
export function applyReward(state: GameState, difficulty: Difficulty): GameState {
  const food = rewardFor(difficulty);
  return {
    ...state,
    inventory: { ...state.inventory, [food]: state.inventory[food] + 1 },
  };
}

/** エサを1つ与えた新しい状態と結果を返す。在庫が無ければ GameError(NO_FOOD) */
export function applyFeed(
  state: GameState,
  foodId: FoodId,
  now: number,
): { state: GameState; outcome: FeedOutcome } {
  const have = state.inventory[foodId];
  if (!have || have < 1) {
    throw new GameError("NO_FOOD", `${FOODS[foodId].name}がありません`);
  }
  const food = FOODS[foodId];
  const levelBefore = levelFromXp(state.cat.xp);
  const xp = state.cat.xp + food.xp;
  const levelAfter = levelFromXp(xp);
  const fullness = Math.min(100, currentFullness(state.cat, now) + food.fullness);
  return {
    state: {
      ...state,
      inventory: { ...state.inventory, [foodId]: have - 1 },
      cat: {
        ...state.cat,
        xp,
        fullness,
        fullnessAt: now,
        totalFeeds: state.cat.totalFeeds + 1,
      },
    },
    outcome: {
      foodId,
      xpGained: food.xp,
      levelBefore,
      levelAfter,
      stageBefore: stageForLevel(levelBefore).id,
      stageAfter: stageForLevel(levelAfter).id,
    },
  };
}

/** ローカルタイムゾーンでの YYYY-MM-DD */
export function toDateKey(ts: number | Date): string {
  const d = typeof ts === "number" ? new Date(ts) : ts;
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 今日（または昨日）まで続いている連続達成日数 */
export function calcStreak(completedAts: number[], now: number): number {
  const days = new Set(completedAts.map((t) => toDateKey(t)));
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);
  if (!days.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(toDateKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(toDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(v: string): boolean {
  if (!DATE_RE.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** 入力を正規化して返す。不正なら GameError(INVALID) */
export function normalizeTaskInput(input: TaskInput): TaskInput {
  const title = input.title.trim();
  if (!title) throw new GameError("INVALID", "タスク名を入力してください");
  if (title.length > TITLE_MAX) throw new GameError("INVALID", `タスク名は${TITLE_MAX}文字までです`);
  const memo = input.memo.trim();
  if (memo.length > MEMO_MAX) throw new GameError("INVALID", `メモは${MEMO_MAX}文字までです`);
  if (!(input.difficulty in DIFFICULTIES)) throw new GameError("INVALID", "むずかしさが不正です");
  const dueDate = input.dueDate ? input.dueDate : null;
  if (dueDate !== null && !isValidDateKey(dueDate)) throw new GameError("INVALID", "期限の日付が不正です");
  return { title, memo, difficulty: input.difficulty, dueDate };
}

export function normalizeCatName(name: string): string {
  const n = name.trim();
  if (!n) throw new GameError("INVALID", "なまえを入力してください");
  if (n.length > NAME_MAX) throw new GameError("INVALID", `なまえは${NAME_MAX}文字までです`);
  return n;
}
