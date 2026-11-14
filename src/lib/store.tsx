"use client";

/**
 * アプリの状態管理。IndexedDB を正とし、書き込み成功後にメモリ上の状態へ反映する。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { openNekoDb, type Db } from "./db";
import { GameError } from "./game";
import * as repo from "./repository";
import type { ExportData, FoodId, GameEvent, GameState, Task, TaskInput } from "./types";

type Status = "loading" | "ready" | "error";

interface Snapshot {
  status: Status;
  errorMessage: string | null;
  tasks: Task[];
  game: GameState | null;
  events: GameEvent[];
}

export interface Store extends Snapshot {
  /** 満腹度の再計算用。1分ごとに更新される現在時刻 */
  now: number;
  addTask(input: TaskInput): Promise<Task>;
  editTask(id: string, input: TaskInput): Promise<Task>;
  removeTask(id: string): Promise<void>;
  completeTask(id: string): Promise<repo.CompleteResult>;
  reopenTask(id: string): Promise<Task>;
  feed(foodId: FoodId): Promise<repo.FeedResult>;
  pet(): Promise<void>;
  renameCat(name: string): Promise<void>;
  exportData(): Promise<ExportData>;
  importData(raw: unknown): Promise<void>;
  resetAll(): Promise<void>;
}

const StoreContext = createContext<Store | null>(null);
const EVENT_LIMIT = 60;

/** 利用者に見せるエラーメッセージへ変換する */
export function toMessage(e: unknown): string {
  if (e instanceof GameError) return e.message;
  if (e instanceof DOMException && e.name === "QuotaExceededError") {
    return "端末の保存容量が足りません";
  }
  return "保存に失敗しました。もう一度お試しください";
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const dbRef = useRef<Db | null>(null);
  const [snap, setSnap] = useState<Snapshot>({
    status: "loading",
    errorMessage: null,
    tasks: [],
    game: null,
    events: [],
  });
  const [now, setNow] = useState(() => Date.now());

  const reload = useCallback(async (db: Db) => {
    const [game, tasks, events] = await Promise.all([
      repo.loadState(db),
      repo.listTasks(db),
      repo.listEvents(db, EVENT_LIMIT),
    ]);
    setNow(Date.now());
    setSnap({ status: "ready", errorMessage: null, game, tasks, events });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof indexedDB === "undefined") throw new Error("no-idb");
        const db = await openNekoDb();
        if (cancelled) {
          db.close();
          return;
        }
        dbRef.current = db;
        await reload(db);
        // ブラウザによる自動削除を避けるためのお願い（対応ブラウザのみ・失敗しても続行）
        void navigator.storage?.persist?.().catch(() => undefined);
      } catch {
        if (!cancelled) {
          setSnap((s) => ({
            ...s,
            status: "error",
            errorMessage:
              "データの保存領域（IndexedDB）を開けませんでした。プライベートブラウズを解除するか、別のブラウザでお試しください。",
          }));
        }
      }
    })();
    return () => {
      cancelled = true;
      dbRef.current?.close();
      dbRef.current = null;
    };
  }, [reload]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const store = useMemo<Store>(() => {
    const need = (): Db => {
      if (!dbRef.current) throw new GameError("STORAGE", "データの準備ができていません");
      return dbRef.current;
    };
    const pushEvents = (prev: GameEvent[], added: GameEvent[]) =>
      [...added].reverse().concat(prev).slice(0, EVENT_LIMIT);

    return {
      ...snap,
      now,
      async addTask(input) {
        const task = await repo.createTask(need(), input);
        setSnap((s) => ({ ...s, tasks: [...s.tasks, task] }));
        return task;
      },
      async editTask(id, input) {
        const task = await repo.updateTask(need(), id, input);
        setSnap((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? task : t)) }));
        return task;
      },
      async removeTask(id) {
        await repo.deleteTask(need(), id);
        setSnap((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
      },
      async completeTask(id) {
        const r = await repo.completeTask(need(), id);
        setSnap((s) => ({
          ...s,
          game: r.state,
          tasks: s.tasks.map((t) => (t.id === id ? r.task : t)),
          events: r.event ? pushEvents(s.events, [r.event]) : s.events,
        }));
        return r;
      },
      async reopenTask(id) {
        const task = await repo.reopenTask(need(), id);
        setSnap((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? task : t)) }));
        return task;
      },
      async feed(foodId) {
        const r = await repo.feedCat(need(), foodId);
        setNow(Date.now());
        setSnap((s) => ({ ...s, game: r.state, events: pushEvents(s.events, r.events) }));
        return r;
      },
      async pet() {
        const game = await repo.petCat(need());
        setSnap((s) => ({ ...s, game }));
      },
      async renameCat(name) {
        const game = await repo.renameCat(need(), name);
        setSnap((s) => ({ ...s, game }));
      },
      exportData() {
        return repo.exportAll(need());
      },
      async importData(raw) {
        const db = need();
        await repo.importAll(db, raw);
        await reload(db);
      },
      async resetAll() {
        const db = need();
        await repo.resetAll(db);
        await reload(db);
      },
    };
  }, [snap, now, reload]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error("useStore は StoreProvider の内側で使ってください");
  return s;
}
