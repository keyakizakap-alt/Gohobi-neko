/**
 * プッシュ通知（アプリを閉じていても届く通知）の画面側。
 * サーバーに「この端末の宛先」と「期限のあるタスク」を登録・更新する。
 * 端末の ID と合言葉（secret）はこの端末の localStorage に置き、バックアップには含めない。
 */
import { registerServiceWorker } from "./notifier";
import { toDateKey } from "./game";
import type { GameState, Task } from "./types";

export type PushStatus =
  | { state: "checking" }
  | { state: "unavailable"; reason: "server" | "browser" | "storage" }
  | { state: "off" }
  | { state: "active" }
  | { state: "error"; message: string };

let status: PushStatus = { state: "checking" };
const listeners = new Set<() => void>();
export const getPushStatus = () => status;
export function subscribePushStatus(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function setStatus(s: PushStatus) {
  status = s;
  listeners.forEach((fn) => fn());
}

const DEVICE_KEY = "gohobi-neko:push-device";
const SENT_KEY = "gohobi-neko:push-last";

interface DeviceIdentity {
  id: string;
  secret: string;
}

function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function loadIdentity(create: boolean): DeviceIdentity | null {
  try {
    const raw = localStorage.getItem(DEVICE_KEY);
    if (raw) {
      const v = JSON.parse(raw) as DeviceIdentity;
      if (typeof v.id === "string" && typeof v.secret === "string") return v;
    }
    if (!create) return null;
    const v = { id: crypto.randomUUID(), secret: randomHex(32) };
    localStorage.setItem(DEVICE_KEY, JSON.stringify(v));
    return v;
  } catch {
    return null;
  }
}

let configPromise: Promise<{ enabled: boolean; publicKey?: string }> | null = null;
function loadConfig() {
  configPromise ??= fetch("/api/push/config", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { enabled: false }))
    .catch(() => ({ enabled: false }));
  return configPromise;
}

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** サーバーに送るタスク：未完了で、期限が昨日〜2週間後のもの（最大50件） */
export function pushItems(tasks: Task[], showTitles: boolean, now: number) {
  const from = toDateKey(now - 86_400_000);
  const to = toDateKey(now + 14 * 86_400_000);
  return tasks
    .filter((t) => t.status === "todo" && t.dueDate && t.dueDate >= from && t.dueDate <= to)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
    .slice(0, 50)
    .map((t) => ({ k: t.id, t: showTitles ? t.title : "", d: t.dueDate! }));
}

async function api(method: "PUT" | "DELETE", body: unknown) {
  const r = await fetch("/api/push/device", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) {
    const msg = await r.json().then((j: { error?: string }) => j.error).catch(() => undefined);
    throw new Error(msg ?? `サーバーエラー（${r.status}）`);
  }
}

/**
 * 通知の設定とタスクに合わせて、サーバーの登録を最新にする。
 * 同じ内容なら送らない。通知がオフなら登録を消す。
 */
export async function syncPush(game: GameState, tasks: Task[], now = Date.now()): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    setStatus({ state: "unavailable", reason: "browser" });
    return;
  }
  const config = await loadConfig();
  if (!config.enabled || !config.publicKey) {
    setStatus({ state: "unavailable", reason: "server" });
    return;
  }
  const wantOn = game.notify.enabled && Notification.permission === "granted";
  const reg = await registerServiceWorker();
  if (!reg) {
    setStatus({ state: "unavailable", reason: "browser" });
    return;
  }
  if (!wantOn) {
    const id = loadIdentity(false);
    const sub = await reg.pushManager.getSubscription().catch(() => null);
    if (id) await api("DELETE", id).catch(() => undefined);
    await sub?.unsubscribe().catch(() => undefined);
    try {
      localStorage.removeItem(SENT_KEY);
    } catch {
      /* 何もしない */
    }
    setStatus({ state: "off" });
    return;
  }
  const id = loadIdentity(true);
  if (!id) {
    setStatus({ state: "unavailable", reason: "storage" });
    return;
  }
  try {
    let sub = await reg.pushManager.getSubscription();
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(config.publicKey) });
    const s = sub.toJSON();
    const body = {
      ...id,
      subscription: { endpoint: s.endpoint, keys: s.keys },
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hour: game.notify.hour,
      catName: game.cat.name,
      items: pushItems(tasks, game.notify.showTitles, now),
    };
    // 前回と同じ内容なら送らない（日付が変わったら送り直す）
    const signature = JSON.stringify({ ...body, day: toDateKey(now) });
    let last: string | null = null;
    try {
      last = localStorage.getItem(SENT_KEY);
    } catch {
      /* 何もしない */
    }
    if (last !== signature) {
      await api("PUT", body);
      try {
        localStorage.setItem(SENT_KEY, signature);
      } catch {
        /* 何もしない */
      }
    }
    setStatus({ state: "active" });
  } catch (e) {
    setStatus({ state: "error", message: e instanceof Error ? e.message : "登録できませんでした" });
  }
}
