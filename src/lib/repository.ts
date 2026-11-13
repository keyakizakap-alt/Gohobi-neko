/**
 * データ操作層。複数ストアにまたがる更新は必ず1トランザクションで行い、
 * 「タスクは完了したのにエサが増えていない」といった不整合を防ぐ。
 */
import type { Db } from "./db";
import {
  GameError,
  SCHEMA_VERSION,
  DIFFICULTIES,
  FOOD_IDS,
  applyFeed,
  applyReward,
  createInitialState,
  isValidDateKey,
  normalizeCatName,
  normalizeTaskInput,
  rewardFor,
  STAGES,
} from "./game";
import type {
  ExportData,
  FeedOutcome,
  FoodId,
  GameEvent,
  GameState,
  Task,
  TaskInput,
} from "./types";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 状態を取得。初回は初期状態を作成して保存する */
export async function loadState(db: Db, now = Date.now()): Promise<GameState> {
  const tx = db.transaction("state", "readwrite");
  let state = await tx.store.get("main");
  if (!state) {
    state = createInitialState(now);
    await tx.store.put(state);
  }
  await tx.done;
  return state;
}

export async function listTasks(db: Db): Promise<Task[]> {
  return db.getAll("tasks");
}

export async function listEvents(db: Db, limit = 60): Promise<GameEvent[]> {
  const out: GameEvent[] = [];
  let cursor = await db.transaction("events").store.openCursor(null, "prev");
  while (cursor && out.length < limit) {
    out.push(cursor.value);
    cursor = await cursor.continue();
  }
  return out;
}

export async function countEvents(db: Db): Promise<number> {
  return db.count("events");
}

export async function createTask(db: Db, input: TaskInput, now = Date.now()): Promise<Task> {
  const v = normalizeTaskInput(input);
  const task: Task = {
    id: newId(),
    ...v,
    status: "todo",
    rewardClaimed: false,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  await db.add("tasks", task);
  return task;
}

export async function updateTask(db: Db, id: string, input: TaskInput, now = Date.now()): Promise<Task> {
  const v = normalizeTaskInput(input);
  const tx = db.transaction("tasks", "readwrite");
  const cur = await tx.store.get(id);
  if (!cur) {
    tx.abort();
    await tx.done.catch(() => undefined);
    throw new GameError("NOT_FOUND", "タスクが見つかりません");
  }
  // 報酬を受け取ったあとは難易度を変えられない（報酬とのズレを防ぐ）
  const difficulty = cur.rewardClaimed ? cur.difficulty : v.difficulty;
  const next: Task = { ...cur, ...v, difficulty, updatedAt: now };
  await tx.store.put(next);
  await tx.done;
  return next;
}

export async function deleteTask(db: Db, id: string): Promise<void> {
  await db.delete("tasks", id);
}

export interface CompleteResult {
  task: Task;
  state: GameState;
  /** 今回もらえたエサ。すでに受け取り済みなら null */
  granted: FoodId | null;
  event: GameEvent | null;
}

export async function completeTask(db: Db, id: string, now = Date.now()): Promise<CompleteResult> {
  const tx = db.transaction(["tasks", "state", "events"], "readwrite");
  const tasks = tx.objectStore("tasks");
  const stateStore = tx.objectStore("state");
  const cur = await tasks.get(id);
  if (!cur) {
    tx.abort();
    await tx.done.catch(() => undefined);
    throw new GameError("NOT_FOUND", "タスクが見つかりません");
  }
  let state = (await stateStore.get("main")) ?? createInitialState(now);
  if (cur.status === "done") {
    await tx.done;
    return { task: cur, state, granted: null, event: null };
  }
  let granted: FoodId | null = null;
  let event: GameEvent | null = null;
  if (!cur.rewardClaimed) {
    granted = rewardFor(cur.difficulty);
    state = applyReward(state, cur.difficulty);
    await stateStore.put(state);
    event = { type: "reward", at: now, foodId: granted, taskTitle: cur.title };
    event.id = await tx.objectStore("events").add(event);
  }
  const task: Task = { ...cur, status: "done", rewardClaimed: true, completedAt: now, updatedAt: now };
  await tasks.put(task);
  await tx.done;
  return { task, state, granted, event };
}

export async function reopenTask(db: Db, id: string, now = Date.now()): Promise<Task> {
  const tx = db.transaction("tasks", "readwrite");
  const cur = await tx.store.get(id);
  if (!cur) {
    tx.abort();
    await tx.done.catch(() => undefined);
    throw new GameError("NOT_FOUND", "タスクが見つかりません");
  }
  const task: Task = { ...cur, status: "todo", completedAt: null, updatedAt: now };
  await tx.store.put(task);
  await tx.done;
  return task;
}

export interface FeedResult {
  state: GameState;
  outcome: FeedOutcome;
  events: GameEvent[];
}

export async function feedCat(db: Db, foodId: FoodId, now = Date.now()): Promise<FeedResult> {
  const tx = db.transaction(["state", "events"], "readwrite");
  const stateStore = tx.objectStore("state");
  const eventStore = tx.objectStore("events");
  const cur = (await stateStore.get("main")) ?? createInitialState(now);
  let result: ReturnType<typeof applyFeed>;
  try {
    result = applyFeed(cur, foodId, now);
  } catch (e) {
    tx.abort();
    await tx.done.catch(() => undefined);
    throw e;
  }
  const { state, outcome } = result;
  await stateStore.put(state);
  const events: GameEvent[] = [{ type: "feed", at: now, foodId }];
  if (outcome.levelAfter > outcome.levelBefore) {
    events.push({ type: "levelup", at: now, level: outcome.levelAfter });
  }
  if (outcome.stageAfter !== outcome.stageBefore) {
    events.push({ type: "evolve", at: now, stage: outcome.stageAfter, level: outcome.levelAfter });
  }
  for (const ev of events) ev.id = await eventStore.add(ev);
  await tx.done;
  return { state, outcome, events };
}

async function mutateState(db: Db, fn: (s: GameState) => GameState, now = Date.now()): Promise<GameState> {
  const tx = db.transaction("state", "readwrite");
  const cur = (await tx.store.get("main")) ?? createInitialState(now);
  const next = fn(cur);
  await tx.store.put(next);
  await tx.done;
  return next;
}

export function petCat(db: Db): Promise<GameState> {
  return mutateState(db, (s) => ({ ...s, cat: { ...s.cat, petCount: s.cat.petCount + 1 } }));
}

export function renameCat(db: Db, name: string): Promise<GameState> {
  const n = normalizeCatName(name);
  return mutateState(db, (s) => ({ ...s, onboarded: true, cat: { ...s.cat, name: n } }));
}

export async function exportAll(db: Db, now = Date.now()): Promise<ExportData> {
  const tx = db.transaction(["tasks", "state", "events"]);
  const [tasks, state, events] = await Promise.all([
    tx.objectStore("tasks").getAll(),
    tx.objectStore("state").get("main"),
    tx.objectStore("events").getAll(),
  ]);
  await tx.done;
  return {
    app: "gohobi-neko",
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now,
    state: state ?? createInitialState(now),
    tasks,
    events,
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isCount = (v: unknown): v is number => isNum(v) && Number.isInteger(v) && v >= 0;

/** インポートデータを検証し、安全な形に組み立て直す。不正なら GameError(INVALID) */
export function parseExportData(raw: unknown): ExportData {
  const bad = (why: string): never => {
    throw new GameError("INVALID", `バックアップを読み込めません（${why}）`);
  };
  if (!isObj(raw) || raw.app !== "gohobi-neko") return bad("このアプリのファイルではありません");
  if (raw.schemaVersion !== SCHEMA_VERSION) return bad("対応していないバージョンです");
  const s = raw.state;
  if (!isObj(s) || !isObj(s.cat) || !isObj(s.inventory)) return bad("ねこのデータがありません");
  const c = s.cat;
  if (typeof c.name !== "string" || !isNum(c.xp) || c.xp < 0 || !isNum(c.fullness) || !isNum(c.fullnessAt) || !isNum(c.bornAt)) {
    return bad("ねこのデータが壊れています");
  }
  const inv = s.inventory;
  const inventory = { kibble: 0, fish: 0, feast: 0 };
  for (const f of FOOD_IDS) {
    const n = inv[f];
    if (!isCount(n)) return bad("エサの数が不正です");
    inventory[f] = n;
  }
  const state: GameState = {
    id: "main",
    schemaVersion: SCHEMA_VERSION,
    onboarded: s.onboarded === true,
    cat: {
      name: normalizeCatName(c.name),
      xp: Math.floor(c.xp),
      fullness: Math.max(0, Math.min(100, c.fullness)),
      fullnessAt: c.fullnessAt,
      petCount: isCount(c.petCount) ? c.petCount : 0,
      totalFeeds: isCount(c.totalFeeds) ? c.totalFeeds : 0,
      bornAt: c.bornAt,
    },
    inventory,
  };
  if (!Array.isArray(raw.tasks) || !Array.isArray(raw.events)) return bad("タスクのデータがありません");
  const ids = new Set<string>();
  const tasks: Task[] = raw.tasks.map((t: unknown): Task => {
    if (!isObj(t) || typeof t.id !== "string" || !t.id || ids.has(t.id)) return bad("タスクIDが不正です");
    ids.add(t.id);
    if (typeof t.title !== "string" || typeof t.difficulty !== "string" || !(t.difficulty in DIFFICULTIES)) {
      return bad("タスクの内容が不正です");
    }
    if (t.status !== "todo" && t.status !== "done") return bad("タスクの状態が不正です");
    if (!isNum(t.createdAt)) return bad("タスクの日時が不正です");
    const dueDate = typeof t.dueDate === "string" && isValidDateKey(t.dueDate) ? t.dueDate : null;
    const v = normalizeTaskInput({
      title: t.title,
      memo: typeof t.memo === "string" ? t.memo : "",
      difficulty: t.difficulty as Task["difficulty"],
      dueDate,
    });
    return {
      id: t.id,
      ...v,
      status: t.status,
      rewardClaimed: t.rewardClaimed === true || t.status === "done",
      createdAt: t.createdAt,
      updatedAt: isNum(t.updatedAt) ? t.updatedAt : t.createdAt,
      completedAt: t.status === "done" ? (isNum(t.completedAt) ? t.completedAt : t.createdAt) : null,
    };
  });
  const stageIds = new Set<string>(STAGES.map((x) => x.id));
  const events: GameEvent[] = raw.events.map((e: unknown): GameEvent => {
    if (!isObj(e) || !isNum(e.at)) return bad("履歴が不正です");
    if (e.type !== "reward" && e.type !== "feed" && e.type !== "levelup" && e.type !== "evolve") {
      return bad("履歴の種類が不正です");
    }
    const ev: GameEvent = { type: e.type, at: e.at };
    if (typeof e.foodId === "string" && (FOOD_IDS as string[]).includes(e.foodId)) ev.foodId = e.foodId as FoodId;
    if (typeof e.taskTitle === "string") ev.taskTitle = e.taskTitle.slice(0, 80);
    if (isNum(e.level)) ev.level = e.level;
    if (typeof e.stage === "string" && stageIds.has(e.stage)) ev.stage = e.stage as GameEvent["stage"];
    return ev;
  });
  events.sort((a, b) => a.at - b.at);
  return { app: "gohobi-neko", schemaVersion: SCHEMA_VERSION, exportedAt: isNum(raw.exportedAt) ? raw.exportedAt : Date.now(), state, tasks, events };
}

/** 既存データをすべて置き換える（1トランザクション。失敗時は元のまま） */
export async function importAll(db: Db, raw: unknown): Promise<void> {
  const data = parseExportData(raw);
  const tx = db.transaction(["tasks", "state", "events"], "readwrite");
  const tasks = tx.objectStore("tasks");
  const events = tx.objectStore("events");
  await Promise.all([tasks.clear(), events.clear(), tx.objectStore("state").clear()]);
  await tx.objectStore("state").put(data.state);
  for (const t of data.tasks) await tasks.put(t);
  for (const e of data.events) await events.add(e);
  await tx.done;
}

export async function resetAll(db: Db): Promise<void> {
  const tx = db.transaction(["tasks", "state", "events"], "readwrite");
  await Promise.all([
    tx.objectStore("tasks").clear(),
    tx.objectStore("events").clear(),
    tx.objectStore("state").clear(),
  ]);
  await tx.done;
}
