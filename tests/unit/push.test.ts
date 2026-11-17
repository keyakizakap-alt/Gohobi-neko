import { beforeEach, describe, expect, it } from "vitest";
import { isAllowedEndpoint, localClock, parseDeviceInput, planPush, pruneSent } from "@/server/pushLogic";
import { welcomeBackLine } from "@/lib/comeback";
import { handleConfig, handleCron, handleDeleteDevice, handlePutDevice, type Sender } from "@/server/pushServer";

// 2026-11-16 08:30 JST = 2026-11-15 23:30 UTC
const NOW = Date.UTC(2026, 10, 15, 23, 30);
const SUB = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } };
const input = (over: Record<string, unknown> = {}) => ({
  id: "dev-1", secret: "s".repeat(40), subscription: SUB, timeZone: "Asia/Tokyo", hour: 9, catName: "たま",
  items: [
    { k: "a", t: "今日の提出", d: "2026-11-16" },
    { k: "b", t: "明日の準備", d: "2026-11-17" },
    { k: "c", t: "来週", d: "2026-11-23" },
  ],
  ...over,
});
const req = (method: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/push/device", {
    method,
    headers: { "content-type": "application/json", origin: "http://localhost:3000", host: "localhost:3000", "x-forwarded-for": "1.2.3.4", ...headers },
    body: JSON.stringify(body),
  });
const cronReq = (auth = "Bearer cron-secret") => new Request("http://localhost/api/push/cron", { headers: { authorization: auth } });

beforeEach(() => {
  process.env.VAPID_PUBLIC_KEY = "pub";
  process.env.VAPID_PRIVATE_KEY = "priv";
  process.env.VAPID_SUBJECT = "https://example.com";
  process.env.CRON_SECRET = "cron-secret";
  delete process.env.KV_REST_API_URL;
  delete process.env.UPSTASH_REDIS_REST_URL;
  (globalThis as { __gohobiPush?: unknown }).__gohobiPush = undefined;
});

describe("送信先と入力の検査", () => {
  it("主要なプッシュサービスの https だけを受け付ける", () => {
    expect(isAllowedEndpoint("https://fcm.googleapis.com/fcm/send/x")).toBe(true);
    expect(isAllowedEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(true);
    expect(isAllowedEndpoint("https://web.push.apple.com/abc")).toBe(true);
    expect(isAllowedEndpoint("http://fcm.googleapis.com/x")).toBe(false);
    expect(isAllowedEndpoint("https://169.254.169.254/latest")).toBe(false);
    expect(isAllowedEndpoint("https://fcm.googleapis.com.evil.example/x")).toBe(false);
    expect(isAllowedEndpoint("https://fcm.googleapis.com:8443/x")).toBe(false);
    expect(isAllowedEndpoint("https://user@fcm.googleapis.com/x")).toBe(false);
    expect(isAllowedEndpoint("not a url")).toBe(false);
  });
  it("不正な入力を拒否し、タイトルの制御文字を除く", () => {
    expect(() => parseDeviceInput(input({ timeZone: "Mars/Base" }))).toThrow();
    expect(() => parseDeviceInput(input({ hour: 24 }))).toThrow();
    expect(() => parseDeviceInput(input({ secret: "short" }))).toThrow();
    expect(() => parseDeviceInput(input({ items: Array.from({ length: 51 }, (_, i) => ({ k: `${i}`, t: "", d: "2026-11-16" })) }))).toThrow();
    expect(() => parseDeviceInput(input({ items: [{ k: "a", t: "x", d: "11/16" }] }))).toThrow();
    const ok = parseDeviceInput(input({ items: [{ k: "a", t: "請求‮書\n", d: "2026-11-16" }] }));
    expect(ok.items[0]!.t).toBe("請求書");
  });
});

describe("送る通知の判定", () => {
  const dev = { ...parseDeviceInput(input()), sent: [] as string[] };
  it("タイムゾーンで今日と明日を決める", () => {
    expect(localClock(NOW, "Asia/Tokyo")).toEqual({ today: "2026-11-16", tomorrow: "2026-11-17", hour: 8 });
    expect(localClock(NOW, "UTC")).toEqual({ today: "2026-11-15", tomorrow: "2026-11-16", hour: 23 });
  });
  it("1時間ごとの呼び出しは設定時刻まで待ち、1日1回の呼び出しは時刻に関係なく送る", () => {
    expect(planPush(dev, NOW, "hourly")).toBeNull(); // 8時台 < 9時
    expect(planPush(dev, NOW + 3_600_000, "hourly")?.keys).toEqual(["a:2026-11-16:today", "b:2026-11-17:tomorrow"]);
    const p = planPush(dev, NOW, "daily")!;
    expect(p.title).toBe("今日までのタスクが1件あるにゃ");
    expect(p.body).toContain("「今日の提出」");
    expect(p.body).not.toContain("来週");
  });
  it("送信済みは送らない。タスク名なしで登録されたら名前を出さない", () => {
    expect(planPush({ ...dev, sent: ["a:2026-11-16:today", "b:2026-11-17:tomorrow"] }, NOW, "daily")).toBeNull();
    const hidden = { ...dev, items: dev.items.map((i) => ({ ...i, t: "" })) };
    const p = planPush(hidden, NOW, "daily")!;
    expect(p.body).not.toContain("「");
    expect(p.body).toContain("明日までのタスクも1件");
  });
  it("昨日より前の送信記録は捨てる", () => {
    expect(pruneSent(["x:2026-11-14:today", "y:2026-11-15:today", "z:2026-11-16:today"], NOW, "Asia/Tokyo", null)).toEqual(["y:2026-11-15:today", "z:2026-11-16:today"]);
  });
});

describe("しばらく開いていない人を、ねこが呼ぶ", () => {
  const base = { ...parseDeviceInput(input({ items: [] })), sent: [] as string[] };
  it("最後に開いた日が今日・昨日なら呼ばない", () => {
    expect(planPush({ ...base, lastOpen: "2026-11-16" }, NOW, "daily")).toBeNull();
    expect(planPush({ ...base, lastOpen: "2026-11-15" }, NOW, "daily")).toBeNull();
    expect(planPush({ ...base, lastOpen: null }, NOW, "daily")).toBeNull();
  });
  it("まる1日開かなかった翌朝に呼び、ホームを開く", () => {
    const p = planPush({ ...base, lastOpen: "2026-11-14" }, NOW, "daily")!;
    expect(p.title).toBe("たまが しょんぼりしてるにゃ…");
    expect(p.body).toContain("きのうは会えなかった");
    expect(p.url).toBe("/");
    expect(p.image).toBe("/notify/lonely.jpg");
    expect(p.keys).toEqual(["comeback:2026-11-14:2"]);
    // 同じ段階では2回呼ばない
    expect(planPush({ ...base, lastOpen: "2026-11-14", sent: p.keys }, NOW + 86_400_000, "daily")).toBeNull();
  });
  it("5日目にもう一度だけ呼び、それ以降は呼ばない", () => {
    const p = planPush({ ...base, lastOpen: "2026-11-11", sent: ["comeback:2026-11-11:2"] }, NOW, "daily")!;
    expect(p.title).toBe("たまが すねちゃったにゃ");
    expect(p.body).toContain("4日も会えてない");
    expect(p.image).toBe("/notify/grumpy.jpg");
    const sent = ["comeback:2026-11-11:2", "comeback:2026-11-11:5"];
    expect(planPush({ ...base, lastOpen: "2026-11-11", sent }, NOW + 5 * 86_400_000, "daily")).toBeNull();
  });
  it("期限の通知とまとめて1通にする", () => {
    const dev = { ...parseDeviceInput(input()), sent: [] as string[], lastOpen: "2026-11-14" };
    const p = planPush(dev, NOW, "daily")!;
    expect(p.title).toBe("たまが しょんぼりしてるにゃ…");
    expect(p.body).toContain("今日までのタスクが1件");
    expect(p.keys).toEqual(["a:2026-11-16:today", "b:2026-11-17:tomorrow", "comeback:2026-11-14:2"]);
  });
  it("1時間ごとの呼び出しでは、設定時刻まで待つ", () => {
    expect(planPush({ ...base, lastOpen: "2026-11-14" }, NOW, "hourly")).toBeNull();
    expect(planPush({ ...base, lastOpen: "2026-11-14" }, NOW + 3_600_000, "hourly")).not.toBeNull();
  });
  it("アプリを開いたら、呼んだ記録を捨てて次に備える", () => {
    const sent = ["comeback:2026-11-14:2", "a:2026-11-16:today"];
    expect(pruneSent(sent, NOW, "Asia/Tokyo", "2026-11-14")).toEqual(sent);
    expect(pruneSent(sent, NOW, "Asia/Tokyo", "2026-11-16")).toEqual(["a:2026-11-16:today"]);
  });
  it("期限の翌日に1回だけ、ご機嫌ななめで知らせる（期限切れのタスク）", () => {
    const dev = { ...parseDeviceInput(input({ items: [{ k: "x", t: "請求書を送る", d: "2026-11-15" }, { k: "a", t: "今日の提出", d: "2026-11-16" }] })), sent: [] as string[], lastOpen: "2026-11-16" };
    const p = planPush(dev, NOW, "daily")!;
    expect(p.title).toBe("たまが ご機嫌ななめにゃ");
    expect(p.body).toContain("期限切れ：「請求書を送る」");
    expect(p.body).toContain("今日まで：「今日の提出」");
    expect(p.image).toBe("/notify/grumpy.jpg");
    expect(p.keys).toEqual(["x:2026-11-15:overdue", "a:2026-11-16:today"]);
    expect(planPush({ ...dev, sent: p.keys }, NOW + 3_600_000, "daily")).toBeNull();
    // 2日以上前に過ぎたものは、もう知らせない
    expect(planPush({ ...dev, items: [{ k: "y", t: "古い", d: "2026-11-14" }] }, NOW, "daily")).toBeNull();
    // タスク名を出さない設定なら、件数だけ
    const hidden = planPush({ ...dev, items: dev.items.map((i) => ({ ...i, t: "" })) }, NOW, "daily")!;
    expect(hidden.body).toContain("期限が過ぎたタスクが1件");
    expect(hidden.body).not.toContain("「");
  });
  it("今日・明日の期限だけなら、にっこり応援する", () => {
    const p = planPush({ ...parseDeviceInput(input()), sent: [] as string[] }, NOW, "daily")!;
    expect(p.image).toBe("/notify/welcome.jpg");
    expect(p.body).toContain("たまが応援してるにゃ");
  });
  it("最後に開いた日の形式を検査する（古い端末は送ってこなくてもよい）", () => {
    expect(parseDeviceInput(input()).lastOpen).toBeNull();
    expect(parseDeviceInput(input({ lastOpen: "2026-11-16" })).lastOpen).toBe("2026-11-16");
    expect(() => parseDeviceInput(input({ lastOpen: "11/16" }))).toThrow();
    expect(() => parseDeviceInput(input({ lastOpen: "2026-13-40" }))).toThrow();
    expect(() => parseDeviceInput(input({ lastOpen: 20261116 }))).toThrow();
  });
});

describe("おかえりのひとこと", () => {
  it("まる1日以上あいたときだけ迎える", () => {
    expect(welcomeBackLine(null, "2026-11-16")).toBeNull();
    expect(welcomeBackLine("2026-11-15", "2026-11-16")).toBeNull();
    expect(welcomeBackLine("2026-11-14", "2026-11-16")).toBe("おかえりにゃ！ 待ってたにゃ〜");
    expect(welcomeBackLine("2026-11-10", "2026-11-16")).toContain("6日ぶり");
    expect(welcomeBackLine("broken", "2026-11-16")).toBeNull();
  });
});

describe("API", () => {
  it("設定がなければ無効を返す", async () => {
    delete process.env.VAPID_PRIVATE_KEY;
    expect(await handleConfig().json()).toEqual({ enabled: false });
    expect((await handlePutDevice(req("PUT", input()))).status).toBe(503);
  });

  it("登録・更新・削除。secret が違うと更新も削除もできない", async () => {
    expect(await handleConfig().json()).toEqual({ enabled: true, publicKey: "pub" });
    expect((await handlePutDevice(req("PUT", input()), NOW)).status).toBe(200);
    expect((await handlePutDevice(req("PUT", input({ secret: "x".repeat(40) })), NOW)).status).toBe(403);
    expect((await handleDeleteDevice(req("DELETE", { id: "dev-1", secret: "x".repeat(40) }))).status).toBe(403);
    expect((await handleDeleteDevice(req("DELETE", { id: "dev-1", secret: "s".repeat(40) }))).status).toBe(200);
  });

  it("別のサイトからの呼び出し・不正な JSON・送信先を拒否する", async () => {
    expect((await handlePutDevice(req("PUT", input(), { origin: "https://evil.example" }))).status).toBe(403);
    expect((await handlePutDevice(new Request("http://localhost:3000/api/push/device", { method: "PUT", headers: { origin: "http://localhost:3000", host: "localhost:3000" }, body: "{" }))).status).toBe(400);
    expect((await handlePutDevice(req("PUT", input({ subscription: { ...SUB, endpoint: "https://internal.local/x" } })))).status).toBe(400);
  });

  it("同じ接続元からの呼び出しは10分に30回まで", async () => {
    let last = 0;
    for (let i = 0; i < 31; i++) last = (await handlePutDevice(req("PUT", input(), { "x-forwarded-for": "9.9.9.9" }), NOW)).status;
    expect(last).toBe(429);
  });

  it("定期実行：鍵が違えば拒否。送ったら記録し、2回目は送らない。無効な購読は消す", async () => {
    await handlePutDevice(req("PUT", input()), NOW);
    await handlePutDevice(req("PUT", input({ id: "dev-2", subscription: { ...SUB, endpoint: "https://fcm.googleapis.com/fcm/send/gone" } })), NOW);
    expect((await handleCron(cronReq("Bearer nope"), "daily", NOW)).status).toBe(401);
    const calls: string[] = [];
    const sender: Sender = async (sub, payload) => {
      if (sub.endpoint.endsWith("/gone")) throw Object.assign(new Error("gone"), { statusCode: 410 });
      calls.push(JSON.parse(payload).title);
      return { statusCode: 201 };
    };
    expect(await (await handleCron(cronReq(), "daily", NOW, sender)).json()).toEqual({ ok: true, mode: "daily", sent: 1, removed: 1, failed: 0 });
    expect(calls).toEqual(["今日までのタスクが1件あるにゃ"]);
    expect(await (await handleCron(cronReq(), "daily", NOW + 60_000, sender)).json()).toMatchObject({ sent: 0, removed: 0 });
    // 端末がタスクを送り直しても、送信済みの記録は残る
    await handlePutDevice(req("PUT", input()), NOW + 120_000);
    expect(await (await handleCron(cronReq(), "hourly", NOW + 3_600_000, sender)).json()).toMatchObject({ sent: 0 });
  });

  it("定期実行：しばらく開いていない端末にはホームを開く呼びかけを送り、開いたらまた呼べるようになる", async () => {
    await handlePutDevice(req("PUT", input({ id: "dev-3", items: [], lastOpen: "2026-11-14" })), NOW - 86_400_000);
    const payloads: { title: string; url: string; image?: string }[] = [];
    const sender: Sender = async (_sub, payload) => {
      payloads.push(JSON.parse(payload));
      return { statusCode: 201 };
    };
    await handleCron(cronReq(), "daily", NOW, sender);
    expect(payloads.find((p) => p.title.includes("しょんぼり"))).toMatchObject({ url: "/", image: "/notify/lonely.jpg" });
    const n = payloads.length;
    await handleCron(cronReq(), "daily", NOW + 3_600_000, sender);
    expect(payloads.length).toBe(n);
    // 開いた（今日の日付で登録し直した）ので、呼ぶ必要はない
    await handlePutDevice(req("PUT", input({ id: "dev-3", items: [], lastOpen: "2026-11-16" })), NOW + 7_200_000);
    await handleCron(cronReq(), "daily", NOW + 86_400_000, sender);
    expect(payloads.length).toBe(n);
  });
});
