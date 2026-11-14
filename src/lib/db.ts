/**
 * IndexedDB スキーマ定義と接続。
 *
 *  DB名: gohobi-neko / version 1
 *  - tasks  : keyPath "id"            … タスク本体（index: by-status）
 *  - state  : keyPath "id" ("main")   … ねこの状態とエサの在庫（1レコード）
 *  - events : autoIncrement "id"      … 報酬・エサやり・成長の履歴（index: by-at）
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { GameEvent, GameState, Task } from "./types";

export const DB_NAME = "gohobi-neko";
export const DB_VERSION = 1;

export interface NekoDB extends DBSchema {
  tasks: { key: string; value: Task; indexes: { "by-status": string } };
  state: { key: string; value: GameState };
  events: { key: number; value: GameEvent; indexes: { "by-at": number } };
}

export type Db = IDBPDatabase<NekoDB>;

export function openNekoDb(name: string = DB_NAME): Promise<Db> {
  return openDB<NekoDB>(name, DB_VERSION, {
    upgrade(db, oldVersion) {
      // バージョンごとに段階的に適用する（将来のマイグレーションはここに追記）
      if (oldVersion < 1) {
        const tasks = db.createObjectStore("tasks", { keyPath: "id" });
        tasks.createIndex("by-status", "status");
        db.createObjectStore("state", { keyPath: "id" });
        const events = db.createObjectStore("events", { keyPath: "id", autoIncrement: true });
        events.createIndex("by-at", "at");
      }
    },
  });
}
