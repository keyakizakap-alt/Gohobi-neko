/** アプリ全体で共有するドメイン型 */

export type Difficulty = "easy" | "normal" | "hard";
export type FoodId = "kibble" | "fish" | "feast";
export type StageId = "kitten" | "young" | "adult" | "master";
export type TaskStatus = "todo" | "done";

export interface Task {
  id: string;
  title: string;
  memo: string;
  difficulty: Difficulty;
  /** ローカル日付 YYYY-MM-DD。期限なしは null */
  dueDate: string | null;
  status: TaskStatus;
  /** 報酬を一度でも受け取ったか（やり直し→再完了での二重取りを防ぐ） */
  rewardClaimed: boolean;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface TaskInput {
  title: string;
  memo: string;
  difficulty: Difficulty;
  dueDate: string | null;
}

export type Inventory = Record<FoodId, number>;

export interface CatState {
  name: string;
  xp: number;
  /** fullnessAt 時点の満腹度 (0-100)。現在値は経過時間から算出する */
  fullness: number;
  fullnessAt: number;
  petCount: number;
  /** 最後になでた時刻（きげんの計算に使う）。未設定の古いデータもある */
  lastPetAt?: number;
  totalFeeds: number;
  bornAt: number;
}

/** 期限の通知の設定 */
export interface NotifySettings {
  enabled: boolean;
  /** 通知する時刻（0〜23時）。この時刻を過ぎたら、その日の通知を出す */
  hour: number;
}

export interface GameState {
  id: "main";
  schemaVersion: number;
  onboarded: boolean;
  cat: CatState;
  inventory: Inventory;
  notify: NotifySettings;
  /** 通知済みの記録（`タスクID:期限:today|tomorrow`）。同じ通知を2回出さないため */
  notified: string[];
}

export type EventType = "reward" | "feed" | "levelup" | "evolve";

export interface GameEvent {
  id?: number;
  type: EventType;
  at: number;
  foodId?: FoodId;
  taskTitle?: string;
  level?: number;
  stage?: StageId;
}

export interface FeedOutcome {
  foodId: FoodId;
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  stageBefore: StageId;
  stageAfter: StageId;
}

export interface ExportData {
  app: "gohobi-neko";
  schemaVersion: number;
  exportedAt: number;
  state: GameState;
  tasks: Task[];
  events: GameEvent[];
}
