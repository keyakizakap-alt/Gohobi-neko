import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it } from "vitest";
import { DEVICE_TTL_DAYS, handleCron, handleDeleteDevice, handlePutDevice, type Sender } from "@/server/pushServer";

const NOW = Date.UTC(2026, 10, 15, 23, 30);
const SUB = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } };
const device = (id: string) => ({ id, secret: "s".repeat(40), subscription: SUB, timeZone: "Asia/Tokyo", hour: 9, catName: "たま", items: [], lastOpen: "2026-11-16" });
const headers = (ip: string, extra: Record<string, string> = {}) => ({ "content-type": "application/json", origin: "http://localhost:3000", host: "localhost:3000", "x-vercel-forwarded-for": ip, ...extra });
const put = (body: unknown, ip = "9.9.9.9", extra: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/push/device", { method: "PUT", headers: headers(ip, extra), body: typeof body === "string" ? body : JSON.stringify(body) });

beforeEach(() => {
  process.env.VAPID_PUBLIC_KEY = "pub";
  process.env.VAPID_PRIVATE_KEY = "priv";
  process.env.VAPID_SUBJECT = "https://example.com";
  process.env.CRON_SECRET = "cron-secret";
  delete process.env.KV_REST_API_URL;
  delete process.env.UPSTASH_REDIS_REST_URL;
  (globalThis as { __gohobiPush?: unknown }).__gohobiPush = undefined;
});

describe("大きすぎる本文", () => {
  it("Content-Length が上限を超えていれば、読む前に断る", async () => {
    const r = await handlePutDevice(put(device("big-1"), "9.9.9.1", { "content-length": "999999999" }), NOW);
    expect(r.status).toBe(400);
  });
  it("Content-Length がなくても、上限を超えた時点で読むのをやめる", async () => {
    let pulled = 0;
    const chunk = new TextEncoder().encode("x".repeat(4096));
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        pulled++;
        if (pulled > 1000) c.close();
        else c.enqueue(chunk);
      },
    });
    const req = new Request("http://localhost:3000/api/push/device", { method: "PUT", headers: headers("9.9.9.2"), body, duplex: "half" } as RequestInit);
    expect((await handlePutDevice(req, NOW)).status).toBe(400);
    expect(pulled).toBeLessThan(10); // 4MB 分を全部は読んでいない
  });
});

describe("偽の登録で上限を埋めさせない", () => {
  it("1つの接続元から1日に新しく登録できるのは10台まで。既存の端末の更新は数えない", async () => {
    for (let i = 0; i < 10; i++) expect((await handlePutDevice(put(device(`fake-${i}`), "6.6.6.6"), NOW)).status).toBe(200);
    expect((await handlePutDevice(put(device("fake-10"), "6.6.6.6"), NOW)).status).toBe(429);
    // 登録済みの端末の更新はできる
    expect((await handlePutDevice(put(device("fake-0"), "6.6.6.6"), NOW)).status).toBe(200);
    // 別の接続元は影響を受けない
    expect((await handlePutDevice(put(device("other-1"), "7.7.7.7"), NOW)).status).toBe(200);
  });
  it("回数制限は Vercel が付けるヘッダーで数え、x-forwarded-for を書き換えても逃れられない", async () => {
    for (let i = 0; i < 10; i++) await handlePutDevice(put(device(`xff-${i}`), "5.5.5.5", { "x-forwarded-for": `10.0.0.${i}` }), NOW);
    expect((await handlePutDevice(put(device("xff-10"), "5.5.5.5", { "x-forwarded-for": "10.0.0.99" }), NOW)).status).toBe(429);
  });
  it(`${DEVICE_TTL_DAYS}日以上更新のない登録は、定期実行で消える`, async () => {
    await handlePutDevice(put(device("old")), NOW - (DEVICE_TTL_DAYS + 1) * 86_400_000);
    await handlePutDevice(put(device("fresh"), "9.9.9.8"), NOW - 86_400_000);
    const sender: Sender = async () => ({ statusCode: 201 });
    const res = await (await handleCron(new Request("http://localhost/api/push/daily", { headers: { authorization: "Bearer cron-secret" } }), "daily", NOW, sender)).json();
    expect(res.removed).toBe(1);
    // 消えた端末は、同じ ID でまた登録し直せる（secret の確認は新規扱い）
    expect((await handlePutDevice(put({ ...device("old"), secret: "t".repeat(40) }, "9.9.9.7"), NOW)).status).toBe(200);
    // 残った端末は、元の secret でしか更新できない
    expect((await handlePutDevice(put({ ...device("fresh"), secret: "t".repeat(40) }, "9.9.9.8"), NOW)).status).toBe(403);
  });
});

describe("登録の削除", () => {
  it("ID の形式がおかしければ断る", async () => {
    const del = (body: unknown) => new Request("http://localhost:3000/api/push/device", { method: "DELETE", headers: headers("9.9.9.3"), body: JSON.stringify(body) });
    expect((await handleDeleteDevice(del({ id: "../../etc", secret: "s".repeat(40) }))).status).toBe(400);
    expect((await handleDeleteDevice(del({ id: "a".repeat(65), secret: "s".repeat(40) }))).status).toBe(400);
    expect((await handleDeleteDevice(del({ id: "ok-1", secret: "s".repeat(500) }))).status).toBe(400);
    expect((await handleDeleteDevice(del({ id: "ok-1", secret: "s".repeat(40) }))).status).toBe(200);
  });
});

describe("Service Worker：通知をタップしたときの移動先", () => {
  const src = readFileSync("public/sw.js", "utf8");
  const ctx: { self: unknown; URL: typeof URL; sameOriginPath?: (p: unknown, f: string) => string } = {
    self: { addEventListener() {}, location: { origin: "https://gohobineko.vercel.app" } },
    URL,
  };
  runInNewContext(`${src}\nthis.sameOriginPath = sameOriginPath;`, ctx);
  const go = (p: unknown) => ctx.sameOriginPath!(p, "/tasks");
  it("サイトの中のパスはそのまま", () => {
    expect(go("/")).toBe("/");
    expect(go("/tasks?x=1#a")).toBe("/tasks?x=1#a");
  });
  it("外のサイトを指すものは /tasks にする", () => {
    for (const p of ["//evil.example", "/\\evil.example/x", "/\\/evil.example", "https://evil.example", "javascript:alert(1)", "evil", 42, null]) {
      expect(go(p)).toBe("/tasks");
    }
  });
});
