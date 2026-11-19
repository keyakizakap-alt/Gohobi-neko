/**
 * IndexedDB の接続を保ち、切れていたらつなぎ直す。
 *
 * iPhone のホーム画面アプリ（Safari）では、アプリを裏に回したあと IndexedDB の接続が切れ、
 * 「Connection to Indexed Database server lost」などで保存が失敗し続けることがある（WebKit の既知の不具合）。
 * そのため、接続が切れたことによる失敗なら、つなぎ直して1回だけやり直す。
 */
import type { Db } from "./db";

/** 接続が切れたことによる失敗か（入力の誤りなど、アプリ側のエラーは対象外） */
export function isConnectionLost(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const name = (e as { name?: unknown }).name;
  const message = String((e as { message?: unknown }).message ?? "");
  // UnknownError：サーバーとの接続が失われた／InvalidStateError：接続が閉じている・閉じかけている
  if (name === "UnknownError" || name === "InvalidStateError") return true;
  return /indexed ?db server|connection to indexed database|database connection is clos/i.test(message);
}

export interface DbConnection {
  /** いまの接続（なければ開く） */
  get(): Promise<Db>;
  /** fn を実行する。接続が切れていたら、つなぎ直して1回だけやり直す */
  run<T>(fn: (db: Db) => Promise<T>): Promise<T>;
  /** 接続を捨てる（次に使うときに開き直す） */
  reset(): void;
  close(): void;
}

export function createDbConnection(open: (onLost: () => void) => Promise<Db>): DbConnection {
  let current: Promise<Db> | null = null;
  let closed = false;

  const reset = () => {
    const old = current;
    current = null;
    old?.then((db) => db.close()).catch(() => undefined);
  };

  const get = (): Promise<Db> => {
    if (closed) return Promise.reject(new Error("closed"));
    if (!current) {
      const p = open(() => {
        // ブラウザ側で接続が切られた
        if (current === p) current = null;
      });
      current = p;
      p.catch(() => {
        if (current === p) current = null;
      });
    }
    return current;
  };

  return {
    get,
    reset,
    async run(fn) {
      try {
        return await fn(await get());
      } catch (e) {
        if (closed || !isConnectionLost(e)) throw e;
        reset();
        return fn(await get());
      }
    },
    close() {
      closed = true;
      reset();
    },
  };
}
