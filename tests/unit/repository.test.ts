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
    const a = await loadState(db, 1000);
    const b = await loadState(db, 2000);
    expect(a.inventory.kibble).toBe(1);
    expect(b.cat.bornAt).toBe(1000);
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
