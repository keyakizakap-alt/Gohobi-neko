import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { openNekoDb, type Db } from "@/lib/db";
import { createDbConnection, isConnectionLost } from "@/lib/dbConnection";
import { GameError } from "@/lib/game";
import { createTask, listTasks } from "@/lib/repository";

const lost = () => new DOMException("Connection to Indexed Database server lost. Refresh the page to try again", "UnknownError");
const input = (title: string) => ({ title, memo: "", difficulty: "normal" as const, dueDate: null });

describe("IndexedDB の接続切れ", () => {
  it("接続切れのエラーだけを見分ける", () => {
    expect(isConnectionLost(lost())).toBe(true);
    expect(isConnectionLost(new DOMException("The database connection is closing.", "InvalidStateError"))).toBe(true);
    expect(isConnectionLost(new GameError("INVALID", "タスク名を入力してください"))).toBe(false);
    expect(isConnectionLost(new DOMException("Key already exists", "ConstraintError"))).toBe(false);
    expect(isConnectionLost(new DOMException("quota", "QuotaExceededError"))).toBe(false);
    expect(isConnectionLost(null)).toBe(false);
  });

  it("3件目の保存で接続が切れていても、つなぎ直して保存できる", async () => {
    let opens = 0;
    const conn = createDbConnection(() => {
      opens++;
      return openNekoDb("conn-test-1");
    });
    await conn.run((db) => createTask(db, input("1件目")));
    await conn.run((db) => createTask(db, input("2件目")));
    // アプリを裏に回して、接続が切れた状態
    let first = true;
    await conn.run(async (db) => {
      if (first) {
        first = false;
        throw lost();
      }
      return createTask(db, input("3件目"));
    });
    await conn.run((db) => createTask(db, input("4件目")));
    expect((await conn.run((db) => listTasks(db))).map((t) => t.title).sort()).toEqual(["1件目", "2件目", "3件目", "4件目"]);
    expect(opens).toBe(2);
    conn.close();
  });

  it("ブラウザが接続を切ったと知らせてきたら、次に使うときに開き直す", async () => {
    let onLost: (() => void) | null = null;
    let opens = 0;
    const conn = createDbConnection((cb) => {
      opens++;
      onLost = cb;
      return openNekoDb("conn-test-2");
    });
    await conn.get();
    onLost!();
    await conn.run((db) => createTask(db, input("切れたあと")));
    expect(opens).toBe(2);
    conn.close();
  });

  it("入力の誤りはやり直さず、そのまま伝える", async () => {
    let calls = 0;
    const conn = createDbConnection(() => openNekoDb("conn-test-3"));
    await expect(
      conn.run(async (db: Db) => {
        calls++;
        return createTask(db, input(" "));
      }),
    ).rejects.toBeInstanceOf(GameError);
    expect(calls).toBe(1);
    conn.close();
  });

  it("開き直しても切れたままなら、エラーを伝える（無限にやり直さない）", async () => {
    let calls = 0;
    const conn = createDbConnection(() => openNekoDb("conn-test-4"));
    await expect(
      conn.run(async () => {
        calls++;
        throw lost();
      }),
    ).rejects.toMatchObject({ name: "UnknownError" });
    expect(calls).toBe(2);
    conn.close();
  });
});
