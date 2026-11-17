/**
 * プッシュ通知のサーバー側ロジック（純粋関数）。
 * 端末から送られてくる情報の検査と、「いま、どの通知を送るか」の判定を行う。
 */
import { comebackMessage, comebackStep, daysBetween } from "@/lib/comeback";
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
  /** 最後にアプリを開いた日（端末のタイムゾーンでの YYYY-MM-DD）。古い版の端末からは届かないので null */
  lastOpen: string | null;
}

export interface DeviceRecord extends Omit<DeviceInput, "secret"> {
  secretHash: string;
  /** 送信済みの通知（`タスクID:期限:today|tomorrow`、呼びかけは `comeback:最後に開いた日:段階`） */
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

/** 実在する日付か（2026-13-40 などを弾く） */
function isRealDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
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
  let lastOpen: string | null = null;
  if (raw.lastOpen !== undefined && raw.lastOpen !== null) {
    if (typeof raw.lastOpen !== "string" || !isRealDate(raw.lastOpen)) return bad("最後に開いた日が正しくありません");
    lastOpen = raw.lastOpen;
  }
  return { id: raw.id, secret: raw.secret, subscription: { endpoint: sub.endpoint, keys: { p256dh, auth } }, timeZone: raw.timeZone, hour, catName, items, lastOpen };
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
  /** 通知をタップしたときに開く画面 */
  url: string;
  /** 通知にそえるねこの画像（対応している端末だけ） */
  image: string;
}

/**
 * いま送るべき通知。
 * - hourly（1時間ごとの呼び出し）：端末で設定した時刻を過ぎていれば送る
 * - daily（1日1回の呼び出し）：時刻に関係なく送る（無料プランの1日1回の定期実行用）
 */
export function planPush(device: Pick<DeviceRecord, "items" | "sent" | "timeZone" | "hour" | "catName" | "lastOpen">, now: number, mode: "hourly" | "daily"): PushPlan | null {
  const { today, tomorrow, hour } = localClock(now, device.timeZone);
  if (mode === "hourly" && hour < device.hour) return null;
  const sent = new Set(device.sent);
  // 期限を過ぎて、まだ終わっていないもの。翌日（哀）と2日後（怒）に1回ずつ知らせる
  const yesterday = localClock(now - 86_400_000, device.timeZone).today;
  const twoDaysAgo = localClock(now - 2 * 86_400_000, device.timeZone).today;
  const late1Items: PushItem[] = [];
  const late2Items: PushItem[] = [];
  const todayItems: PushItem[] = [];
  const tomorrowItems: PushItem[] = [];
  const keys: string[] = [];
  for (const it of device.items) {
    const kind = it.d === today ? "today" : it.d === tomorrow ? "tomorrow" : it.d === yesterday ? "late1" : it.d === twoDaysAgo ? "late2" : null;
    if (!kind) continue;
    const key = `${it.k}:${it.d}:${kind}`;
    if (sent.has(key)) continue;
    keys.push(key);
    ({ today: todayItems, tomorrow: tomorrowItems, late1: late1Items, late2: late2Items })[kind].push(it);
  }
  // しばらく開いていなければ、ねこが呼ぶ（期限の通知とまとめて1通にする）
  const step = device.lastOpen ? comebackStep(device.lastOpen, today) : null;
  const comebackKey = step && device.lastOpen ? `comeback:${device.lastOpen}:${step}` : null;
  if (comebackKey && !sent.has(comebackKey)) {
    const away = daysBetween(device.lastOpen!, today) ?? step!;
    const { title, body, image } = comebackMessage(device.catName, away, { overdue: late1Items.length + late2Items.length, today: todayItems.length, tomorrow: tomorrowItems.length });
    return { keys: [...keys, comebackKey], title, body, image, tag: `comeback-${today}`, url: "/" };
  }
  if (keys.length === 0) return null;
  const showTitles = [...late1Items, ...late2Items, ...todayItems, ...tomorrowItems].every((it) => it.t);
  const t = (list: PushItem[]) => list.map((i) => i.t);
  const { title, body, image } = formatReminder(t(todayItems), t(tomorrowItems), device.catName, showTitles, t(late1Items), t(late2Items));
  return { keys, title, body, image, tag: `due-${today}`, url: "/tasks" };
}

/**
 * 送信済みの記録から、いらなくなった分を捨てる（記録が増え続けないように）。
 * 期限の通知は2日より前の分、呼びかけは「最後に開いた日」が変わった（＝アプリを開いた）分を捨てる。
 */
export function pruneSent(sent: string[], now: number, timeZone: string, lastOpen: string | null): string[] {
  // 期限の2日後まで知らせるので、2日前までの記録は残す
  const { today } = localClock(now - 2 * 86_400_000, timeZone);
  return sent
    .filter((k) => {
      const [kind, date] = k.split(":");
      if (kind === "comeback") return date === lastOpen;
      return (date ?? "") >= today;
    })
    .slice(-200);
}
