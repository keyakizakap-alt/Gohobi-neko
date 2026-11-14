import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { openNekoDb, type Db } from "@/lib/db";
import { GameError } from "@/lib/game";
import {
  completeTask,
  createTask,
  deleteTask,
  exportAll,
  feedCat,
  importAll,
  listEvents,
  listTasks,
  loadState,
  parseExportData,
  sanitizeEvent,
  sanitizeState,
  sanitizeTask,
  renameCat,
  reopenTask,
  resetAll,
  updateTask,
} from "@/lib/repository";

let db: Db;
let seq = 0;
const input = { title: "洗濯", memo: "", difficulty: "normal" as const, dueDate: null };

beforeEach(async () => {
  db = await openNekoDb(`test-${++seq}`);
});

describe("repository", () => {
  it("初回は初期状態を作り、2回目以降は同じものを返す", async () => {
    const t0 = Date.UTC(2026, 0, 1);
    const a = await loadState(db, t0);
    const b = await loadState(db, t0 + 5000);
    expect(a.inventory.kibble).toBe(1);
    expect(b.cat.bornAt).toBe(t0);
  });

  it("タスクの追加・編集・削除", async () => {
    const t = await createTask(db, input);
    expect((await listTasks(db)).length).toBe(1);
    const u = await updateTask(db, t.id, { ...input, title: "洗濯物をたたむ", difficulty: "hard" });
    expect(u.title).toBe("洗濯物をたたむ");
    expect(u.difficulty).toBe("hard");
    await deleteTask(db, t.id);
    expect(await listTasks(db)).toEqual([]);
  });

  it("不正な入力は保存されない", async () => {
    await expect(createTask(db, { ...input, title: " " })).rejects.toBeInstanceOf(GameError);
    expect(await listTasks(db)).toEqual([]);
    await expect(updateTask(db, "nope", input)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("完了でエサを獲得し、履歴が残る", async () => {
    await loadState(db);
    const t = await createTask(db, input);
    const r = await completeTask(db, t.id);
    expect(r.granted).toBe("fish");
    expect(r.task.status).toBe("done");
    expect((await loadState(db)).inventory.fish).toBe(1);
    const events = await listEvents(db);
    expect(events[0]).toMatchObject({ type: "reward", foodId: "fish", taskTitle: "洗濯" });
  });

  it("やり直して再完了しても報酬は二重にもらえない", async () => {
    await loadState(db);
    const t = await createTask(db, input);
    await completeTask(db, t.id);
    const again = await completeTask(db, t.id); // 連打
    expect(again.granted).toBeNull();
    const re = await reopenTask(db, t.id);
    expect(re.status).toBe("todo");
    expect(re.rewardClaimed).toBe(true);
    const r2 = await completeTask(db, t.id);
    expect(r2.granted).toBeNull();
    expect((await loadState(db)).inventory.fish).toBe(1);
    // 報酬受け取り後は難易度を変更できない
    const u = await updateTask(db, t.id, { ...input, difficulty: "hard" });
    expect(u.difficulty).toBe("normal");
  });

  it("エサやりで在庫が減りXPが増える。在庫がなければ何も変わらない", async () => {
    await loadState(db);
    const r = await feedCat(db, "kibble");
    expect(r.state.inventory.kibble).toBe(0);
    expect(r.state.cat.xp).toBe(10);
    await expect(feedCat(db, "kibble")).rejects.toMatchObject({ code: "NO_FOOD" });
    const s = await loadState(db);
    expect(s.cat.xp).toBe(10);
    expect(s.cat.totalFeeds).toBe(1);
    expect((await listEvents(db)).filter((e) => e.type === "feed").length).toBe(1);
  });

  it("レベルアップ時は履歴にlevelupが残る", async () => {
    await loadState(db);
    for (let i = 0; i < 1; i++) {
      const t = await createTask(db, { ...input, difficulty: "hard" });
      await completeTask(db, t.id);
    }
    const r = await feedCat(db, "feast"); // 35xp → Lv2
    expect(r.outcome.levelAfter).toBe(2);
    expect(r.events.map((e) => e.type)).toEqual(["feed", "levelup"]);
  });

  it("エクスポート→リセット→インポートで復元できる", async () => {
    await loadState(db);
    await renameCat(db, "たま");
    const t = await createTask(db, input);
    await completeTask(db, t.id);
    await createTask(db, { ...input, title: "買い物", dueDate: "2026-12-01" });
    const dump = JSON.parse(JSON.stringify(await exportAll(db)));

    await resetAll(db);
    expect(await listTasks(db)).toEqual([]);
    expect((await loadState(db)).cat.name).toBe("ねこ");

    await importAll(db, dump);
    const s = await loadState(db);
    expect(s.cat.name).toBe("たま");
    expect(s.inventory.fish).toBe(1);
    expect((await listTasks(db)).length).toBe(2);
    expect((await listEvents(db)).length).toBe(1);
  });

  it("壊れたバックアップは拒否し、既存データを保つ", async () => {
    await loadState(db);
    await createTask(db, input);
    await expect(importAll(db, { app: "other" })).rejects.toBeInstanceOf(GameError);
    const dump = JSON.parse(JSON.stringify(await exportAll(db)));
    dump.state.inventory.fish = -3;
    await expect(importAll(db, dump)).rejects.toBeInstanceOf(GameError);
    dump.state.inventory.fish = 0;
    dump.tasks[0].title = "";
    expect(() => parseExportData(dump)).toThrowError(GameError);
    expect((await listTasks(db)).length).toBe(1);
  });
});

describe("細工したバックアップを拒否する", () => {
  async function dump() {
    await loadState(db);
    await createTask(db, input);
    return JSON.parse(JSON.stringify(await exportAll(db)));
  }
  it("XP・個数・日時の範囲外を拒否する", async () => {
    const base = await dump();
    const cases: Array<(d: any) => void> = [
      (d) => (d.state.cat.xp = 1e300),
      (d) => (d.state.inventory.kibble = 1e12),
      (d) => (d.state.cat.bornAt = Date.now() + 10 * 86_400_000),
      (d) => (d.tasks[0].createdAt = -1),
      (d) => (d.tasks = Array.from({ length: 5001 }, (_, i) => ({ ...d.tasks[0], id: `t${i}` }))),
      (d) => (d.tasks[0].id = "x".repeat(65)),
    ];
    for (const mutate of cases) {
      const d = structuredClone(base);
      mutate(d);
      expect(() => parseExportData(d)).toThrowError(GameError);
    }
  });
  it("__proto__ などの余計なキーは取り込まない", async () => {
    const d = await dump();
    const text = JSON.stringify(d).replace('"cat":{', '"cat":{"__proto__":{"polluted":1},"extra":"x",');
    const parsed = parseExportData(JSON.parse(text));
    expect(Object.keys(parsed.state.cat).sort()).toEqual(["bornAt", "fullness", "fullnessAt", "name", "petCount", "totalFeeds", "xp"]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("壊れた保存データを読んでも落ちない", () => {
  const put = (store: "state" | "tasks" | "events", value: unknown) => db.put(store, value as never);

  it("状態が壊れていても、正しい形に補正して返す", async () => {
    await put("state", { id: "main", onboarded: true, cat: { name: "x", xp: "abc", fullness: "z", fullnessAt: "q", petCount: null, totalFeeds: {}, bornAt: null }, inventory: { kibble: "many", fish: -3, feast: Number.NaN } });
    const s = await loadState(db);
    expect(s.cat).toMatchObject({ name: "x", xp: 0, fullness: 50, petCount: 0, totalFeeds: 0 });
    expect(s.inventory).toEqual({ kibble: 0, fish: 0, feast: 0 });
    expect(Number.isFinite(s.cat.bornAt)).toBe(true);
    // 補正した内容で書き直されている
    expect((await db.get("state", "main"))?.cat.xp).toBe(0);
  });

  it("cat や inventory が無い・null でも初期状態になる", () => {
    for (const raw of [undefined, null, [], "x", { id: "main" }, { id: "main", cat: null, inventory: null, onboarded: true }]) {
      const s = sanitizeState(raw, 1_800_000_000_000);
      expect(s.cat.name).toBe("ねこ");
      expect(s.onboarded).toBe(false);
      expect(s.inventory.kibble).toBe(1);
    }
    expect(sanitizeState({ cat: { xp: 1e308 } }).cat.xp).toBe(999_900_000); // 上限（Lv.10000 相当）
  });

  it("読めないタスクは外し、読める部分は補正する", async () => {
    await put("tasks", { id: "bad1", title: { a: 1 }, difficulty: "ultra" });
    await put("tasks", { id: "bad2" });
    await put("tasks", { id: "ok1", title: "  そうじ\u202E  ", memo: 5, difficulty: "ultra", dueDate: "not-a-date", status: "weird", createdAt: "x", completedAt: "y" });
    const list = await listTasks(db);
    expect(list.map((t) => t.id)).toEqual(["ok1"]);
    expect(list[0]).toMatchObject({ title: "そうじ", memo: "", difficulty: "normal", dueDate: null, status: "todo", completedAt: null });
    // 壊れたタスクも完了でき、報酬が入る
    const r = await completeTask(db, "ok1");
    expect(r.granted).toBe("fish");
    await expect(completeTask(db, "bad2")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(sanitizeTask(null)).toBeNull();
  });

  it("読めない履歴は外す", async () => {
    await put("events", { type: "???", at: "never" });
    await put("events", { type: "evolve", at: 1, stage: "dragon", level: "x" });
    await put("events", { type: "feed", at: 1_800_000_000_000, foodId: "gold" });
    const list = await listEvents(db);
    expect(list.map((e) => e.type).sort()).toEqual(["evolve", "feed"]);
    expect(list.find((e) => e.type === "evolve")).not.toHaveProperty("stage");
    expect(list.find((e) => e.type === "feed")).not.toHaveProperty("foodId");
    expect(sanitizeEvent({ type: "feed" })).toBeNull();
  });

  it("壊れたデータを含んでいても、バックアップは読み込める形で出力される", async () => {
    await put("state", { id: "main", cat: null });
    await put("tasks", { id: "bad2" });
    await put("events", { type: "???", at: "never" });
    const dump = JSON.parse(JSON.stringify(await exportAll(db)));
    expect(() => parseExportData(dump)).not.toThrow();
  });
});

describe("不可視文字の除去", () => {
  it("文字の並びを変える制御文字や改行を、タスク名・名前から取り除く", async () => {
    const t = await createTask(db, { ...input, title: "請求書\u202Egnp.exe\u202C\nを送る", memo: "1行目\r\n2行目\u0007" });
    expect(t.title).toBe("請求書gnp.exe を送る");
    expect(t.memo).toBe("1行目\n2行目");
    expect((await renameCat(db, "た\u200Fま\t")).cat.name).toBe("たま");
    await expect(createTask(db, { ...input, title: "\u202E\u200F" })).rejects.toBeInstanceOf(GameError);
  });
});
