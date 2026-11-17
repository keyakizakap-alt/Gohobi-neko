/**
 * プッシュ通知の購読情報の保存先。
 * - 本番：Upstash Redis（Vercel の Marketplace から追加すると環境変数が自動で入る）
 * - 開発・テスト：メモリ（サーバーを再起動すると消える）
 */
import { Redis } from "@upstash/redis";
import type { DeviceRecord } from "./pushLogic";

export interface PushStore {
  kind: "redis" | "memory";
  get(id: string): Promise<DeviceRecord | null>;
  put(device: DeviceRecord): Promise<void>;
  del(id: string): Promise<void>;
  ids(): Promise<string[]>;
  count(): Promise<number>;
  /** 呼び出し回数を数える（期限つき）。回数を返す */
  hit(key: string, ttlSeconds: number): Promise<number>;
}

const PREFIX = "gohobi:push:";
/** 登録の保存期間（秒）。定期実行が止まっていても、古い登録が残り続けないようにする */
const DEVICE_EXPIRE = 35 * 86_400;

function redisStore(redis: Redis): PushStore {
  return {
    kind: "redis",
    async get(id) {
      return (await redis.get<DeviceRecord>(`${PREFIX}dev:${id}`)) ?? null;
    },
    async put(device) {
      await redis.set(`${PREFIX}dev:${device.id}`, device, { ex: DEVICE_EXPIRE });
      await redis.sadd(`${PREFIX}devices`, device.id);
    },
    async del(id) {
      await redis.del(`${PREFIX}dev:${id}`);
      await redis.srem(`${PREFIX}devices`, id);
    },
    async ids() {
      return (await redis.smembers(`${PREFIX}devices`)) as string[];
    },
    async count() {
      return redis.scard(`${PREFIX}devices`);
    },
    async hit(key, ttl) {
      // 期限の設定と回数の加算を1回のトランザクションで行う（途中で失敗して、期限のない記録が残らないように）
      const k = `${PREFIX}rl:${key}`;
      const [, n] = await redis.multi().set(k, 0, { nx: true, ex: ttl }).incr(k).exec<[unknown, number]>();
      return n;
    },
  };
}

function memoryStore(): PushStore {
  const g = globalThis as unknown as { __gohobiPush?: { devices: Map<string, DeviceRecord>; hits: Map<string, { n: number; until: number }> } };
  g.__gohobiPush ??= { devices: new Map(), hits: new Map() };
  const { devices, hits } = g.__gohobiPush;
  return {
    kind: "memory",
    async get(id) {
      const d = devices.get(id);
      return d ? structuredClone(d) : null;
    },
    async put(device) {
      devices.set(device.id, structuredClone(device));
    },
    async del(id) {
      devices.delete(id);
    },
    async ids() {
      return [...devices.keys()];
    },
    async count() {
      return devices.size;
    },
    async hit(key, ttl) {
      const now = Date.now();
      // 期限切れの記録を時々掃除する（開発・テスト用のメモリが増え続けないように）
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.until < now) hits.delete(k);
      const h = hits.get(key);
      if (!h || h.until < now) {
        hits.set(key, { n: 1, until: now + ttl * 1000 });
        return 1;
      }
      h.n++;
      return h.n;
    },
  };
}

/**
 * 使う保存先を返す。本番で Redis の設定がないときは null（プッシュ通知は無効）。
 * PUSH_ALLOW_MEMORY=1 のときだけ、本番ビルドでもメモリを使う（E2E テスト用）。
 */
export function getPushStore(): PushStore | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return redisStore(new Redis({ url, token }));
  if (process.env.NODE_ENV !== "production" || process.env.PUSH_ALLOW_MEMORY === "1") return memoryStore();
  return null;
}
