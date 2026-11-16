/**
 * プッシュ通知のサーバー側ロジック（純粋関数）。
 * 端末から送られてくる情報の検査と、「いま、どの通知を送るか」の判定を行う。
 */
import { formatReminder } from "@/lib/reminders";

/** 送信先として受け付けるプッシュサービス（端末が教えてくる URL を、そのまま信用しない） */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];

export const MAX_ITEMS = 50;
const MAX_TITLE = 60;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

export interface PushItem {
  /** タスク ID */
  k: string;
  /** タスク名（「タスク名を表示」がオフなら空） */
  t: string;
  /** 期限 YYYY-MM-DD */
  d: string;
}

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface DeviceInput {
  id: string;
  secret: string;
  subscription: PushSubscriptionJSON;
  timeZone: string;
  hour: number;
  catName: string;
  items: PushItem[];
}

export interface DeviceRecord extends Omit<DeviceInput, "secret"> {
  secretHash: string;
  /** 送信済みの通知（`タスクID:期限:today|tomorrow`） */
  sent: string[];
  updatedAt: number;
}

export class InputError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

export function isAllowedEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  return url.protocol === "https:" && !url.port && !url.username && PUSH_HOSTS.some((re) => re.test(url.hostname));
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** 端末から届いた登録内容を検査して、安全な形に組み直す。不正なら InputError */
export function parseDeviceInput(raw: unknown): DeviceInput {
  const bad = (why: string): never => {
    throw new InputError(why);
  };
  if (!isObj(raw)) return bad("形式が正しくありません");
  if (!str(raw.id, 64) || !/^[A-Za-z0-9-]+$/.test(raw.id)) return bad("id が正しくありません");
  if (!str(raw.secret, 128) || raw.secret.length < 32) return bad("secret が正しくありません");
  const sub = raw.subscription;
  if (!isObj(sub) || !str(sub.endpoint, 1024) || !isObj(sub.keys)) return bad("購読情報が正しくありません");
  if (!isAllowedEndpoint(sub.endpoint)) return bad("対応していない送信先です");
  const { p256dh, auth } = sub.keys;
  if (!str(p256dh, 200) || !B64URL.test(p256dh) || !str(auth, 64) || !B64URL.test(auth)) return bad("購読の鍵が正しくありません");
  if (!str(raw.timeZone, 64) || !isValidTimeZone(raw.timeZone)) return bad("タイムゾーンが正しくありません");
  const hour = raw.hour;
  if (typeof hour !== "number" || !Number.isInteger(hour) || hour < 0 || hour > 23) return bad("時刻が正しくありません");
  const catName = typeof raw.catName === "string" ? raw.catName.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, 12) || "ねこ" : "ねこ";
  if (!Array.isArray(raw.items) || raw.items.length > MAX_ITEMS) return bad("タスクが多すぎます");
  const items: PushItem[] = raw.items.map((it) => {
    if (!isObj(it) || !str(it.k, 64) || typeof it.d !== "string" || !DATE_RE.test(it.d)) return bad("タスクの形式が正しくありません");
    const t = typeof it.t === "string" ? it.t.replace(/[\u0000-\u001F\u007F‪-‮⁦-⁩]/g, "").slice(0, MAX_TITLE) : "";
    return { k: it.k, t, d: it.d };
  });
  return { id: raw.id, secret: raw.secret, subscription: { endpoint: sub.endpoint, keys: { p256dh, auth } }, timeZone: raw.timeZone, hour, catName, items };
}

/** タイムゾーンでの「今日」「明日」の日付と、いまの時（0〜23） */
export function localClock(now: number, timeZone: string): { today: string; tomorrow: string; hour: number } {
  const fmt = (t: number) => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(t));
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
  };
  const a = fmt(now);
  // 「明日」は、今日の日付に1日足した日（夏時間の切り替えでもずれないよう、正午基準で計算）
  const [y, m, d] = a.date.split("-").map(Number) as [number, number, number];
  const next = new Date(Date.UTC(y, m - 1, d + 1, 12));
  const tomorrow = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
  return { today: a.date, tomorrow, hour: a.hour };
}

export interface PushPlan {
  keys: string[];
  title: string;
  body: string;
  tag: string;
}

/**
 * いま送るべき通知。
 * - hourly（1時間ごとの呼び出し）：端末で設定した時刻を過ぎていれば送る
 * - daily（1日1回の呼び出し）：時刻に関係なく送る（無料プランの1日1回の定期実行用）
 */
export function planPush(device: Pick<DeviceRecord, "items" | "sent" | "timeZone" | "hour" | "catName">, now: number, mode: "hourly" | "daily"): PushPlan | null {
  const { today, tomorrow, hour } = localClock(now, device.timeZone);
  if (mode === "hourly" && hour < device.hour) return null;
  const sent = new Set(device.sent);
  const todayItems: PushItem[] = [];
  const tomorrowItems: PushItem[] = [];
  const keys: string[] = [];
  for (const it of device.items) {
    const kind = it.d === today ? "today" : it.d === tomorrow ? "tomorrow" : null;
    if (!kind) continue;
    const key = `${it.k}:${it.d}:${kind}`;
    if (sent.has(key)) continue;
    keys.push(key);
    (kind === "today" ? todayItems : tomorrowItems).push(it);
  }
  if (keys.length === 0) return null;
  const showTitles = [...todayItems, ...tomorrowItems].every((it) => it.t);
  const { title, body } = formatReminder(todayItems.map((i) => i.t), tomorrowItems.map((i) => i.t), device.catName, showTitles);
  return { keys, title, body, tag: `due-${today}` };
}

/** 送信済みの記録から、昨日より前の分を捨てる（記録が増え続けないように） */
export function pruneSent(sent: string[], now: number, timeZone: string): string[] {
  const { today } = localClock(now - 86_400_000, timeZone);
  return sent.filter((k) => (k.split(":")[1] ?? "") >= today).slice(-200);
}
