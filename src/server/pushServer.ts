/**
 * プッシュ通知の API 本体（Route Handler から呼ぶ）。
 * テストから直接呼べるよう、Request を受け取って Response を返す関数にしてある。
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { sendNotification, setVapidDetails } from "web-push";
import { InputError, parseDeviceInput, planPush, pruneSent, type DeviceRecord } from "./pushLogic";
import { getPushStore, type PushStore } from "./pushStore";

const MAX_BODY = 16_000;
const MAX_DEVICES = 2_000;
const RATE_LIMIT = 30; // 10分あたり、1つの接続元から
const RATE_WINDOW = 600;

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

interface PushEnv {
  publicKey: string;
  privateKey: string;
  subject: string;
}

function pushEnv(): PushEnv | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return sha256(fwd || req.headers.get("x-real-ip") || "local").slice(0, 32);
}

/** 同じサイトからの呼び出しか（他のサイトから勝手に登録させない） */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > MAX_BODY) throw new InputError("データが大きすぎます");
  try {
    return JSON.parse(text);
  } catch {
    throw new InputError("JSON の形式が正しくありません");
  }
}

async function guard(req: Request): Promise<{ store: PushStore } | Response> {
  const store = getPushStore();
  if (!store || !pushEnv()) return json({ error: "プッシュ通知はこのサーバーで有効になっていません" }, 503);
  if (!sameOrigin(req)) return json({ error: "許可されていない呼び出し元です" }, 403);
  if ((await store.hit(clientKey(req), RATE_WINDOW)) > RATE_LIMIT) return json({ error: "回数が多すぎます。しばらく待ってください" }, 429);
  return { store };
}

/** GET /api/push/config：プッシュ通知が使えるかと、公開鍵 */
export function handleConfig(): Response {
  const env = pushEnv();
  const store = getPushStore();
  return json(env && store ? { enabled: true, publicKey: env.publicKey } : { enabled: false });
}

/** PUT /api/push/device：端末の登録・更新（購読情報と、期限のあるタスク） */
export async function handlePutDevice(req: Request, now = Date.now()): Promise<Response> {
  const g = await guard(req);
  if (g instanceof Response) return g;
  const { store } = g;
  let input;
  try {
    input = parseDeviceInput(await readJson(req));
  } catch (e) {
    if (e instanceof InputError) return json({ error: e.message }, 400);
    throw e;
  }
  const current = await store.get(input.id);
  const secretHash = sha256(input.secret);
  if (current && !sameHash(current.secretHash, secretHash)) return json({ error: "この端末の情報は更新できません" }, 403);
  if (!current && (await store.count()) >= MAX_DEVICES) return json({ error: "登録できる端末の数の上限です" }, 503);
  const { secret: _secret, ...rest } = input;
  void _secret;
  const record: DeviceRecord = {
    ...rest,
    secretHash,
    // 期限を変えたタスクは、新しい期限でまた知らせる（キーに期限が入っているので自然にそうなる）
    sent: pruneSent(current?.sent ?? [], now, input.timeZone, input.lastOpen),
    updatedAt: now,
  };
  await store.put(record);
  return json({ ok: true });
}

/** DELETE /api/push/device：端末の登録を消す */
export async function handleDeleteDevice(req: Request): Promise<Response> {
  const g = await guard(req);
  if (g instanceof Response) return g;
  const { store } = g;
  let body: unknown;
  try {
    body = await readJson(req);
  } catch (e) {
    if (e instanceof InputError) return json({ error: e.message }, 400);
    throw e;
  }
  const b = body as { id?: unknown; secret?: unknown };
  if (typeof b.id !== "string" || typeof b.secret !== "string") return json({ error: "形式が正しくありません" }, 400);
  const current = await store.get(b.id);
  if (current && !sameHash(current.secretHash, sha256(b.secret))) return json({ error: "この端末の情報は消せません" }, 403);
  if (current) await store.del(b.id);
  return json({ ok: true });
}

export type Sender = (sub: DeviceRecord["subscription"], payload: string) => Promise<{ statusCode: number }>;

function webPushSender(env: PushEnv): Sender {
  setVapidDetails(env.subject, env.publicKey, env.privateKey);
  return async (sub, payload) => {
    const r = await sendNotification(sub, payload, { TTL: 6 * 60 * 60, urgency: "normal" });
    return { statusCode: r.statusCode };
  };
}

/** テストで送信内容を確かめるための記録（PUSH_DRY_RUN=1 のときだけ使う） */
export const dryRunLog: { endpoint: string; payload: { title: string; body: string; tag: string; url: string } }[] = [];

/** GET /api/push/cron：期限の近いタスクを、登録された全端末に知らせる */
export async function handleCron(req: Request, mode: "hourly" | "daily", now = Date.now(), sender?: Sender): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || !sameHash(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) return json({ error: "Unauthorized" }, 401);
  const store = getPushStore();
  const env = pushEnv();
  if (!store || !env) return json({ error: "プッシュ通知はこのサーバーで有効になっていません" }, 503);
  const send: Sender =
    sender ??
    (process.env.PUSH_DRY_RUN === "1"
      ? async (sub, payload) => {
          dryRunLog.push({ endpoint: sub.endpoint, payload: JSON.parse(payload) });
          return { statusCode: 201 };
        }
      : webPushSender(env));
  let sent = 0;
  let removed = 0;
  let failed = 0;
  const preview: { title: string; body: string }[] = [];
  for (const id of await store.ids()) {
    const device = await store.get(id);
    if (!device) {
      await store.del(id);
      continue;
    }
    const plan = planPush(device, now, mode);
    if (!plan) continue;
    try {
      await send(device.subscription, JSON.stringify({ title: plan.title, body: plan.body, tag: plan.tag, url: plan.url }));
      if (process.env.PUSH_DRY_RUN === "1") preview.push({ title: plan.title, body: plan.body });
      device.sent = pruneSent([...device.sent, ...plan.keys], now, device.timeZone, device.lastOpen ?? null);
      await store.put(device);
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      // 404 / 410：購読が無効になった（ブラウザで通知を止めた等）。登録を消す
      if (status === 404 || status === 410) {
        await store.del(id);
        removed++;
      } else {
        failed++;
        console.error("push send failed", status ?? String(e).slice(0, 200));
      }
    }
  }
  // テスト用（PUSH_DRY_RUN=1）のときだけ、送った内容を返す
  return json(process.env.PUSH_DRY_RUN === "1" ? { ok: true, mode, sent, removed, failed, preview } : { ok: true, mode, sent, removed, failed });
}
