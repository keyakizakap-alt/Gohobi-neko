/**
 * ねこの「ひとり遊び」の決め方（純粋関数）。
 * ホーム画面で、何も操作していないときに、ときどき あくび・毛づくろい・居眠り をする。
 */
import type { Mood } from "./game";

export type IdleAction = "yawn" | "groom";
export type DayPhaseLike = "morning" | "day" | "evening" | "night";

/** 各動作の長さ（ミリ秒） */
export const ACTION_MS: Record<IdleAction, number> = { yawn: 2200, groom: 3600 };

/** 次の動作までの待ち時間（12〜24秒）。rand は 0以上1未満 */
export function nextIdleDelay(rand: number): number {
  return Math.round(12_000 + Math.min(Math.max(rand, 0), 0.999) * 12_000);
}

/**
 * 次に何をするか。眠そうな時間帯はあくびが多く、満腹でごきげんなときは毛づくろいが多い。
 * おなかがすいているときは何もしない（ごはんを待っている）。
 */
export function pickIdleAction(rand: number, phase: DayPhaseLike, mood: Mood): IdleAction | null {
  if (mood === "hungry") return null;
  const yawnRate = phase === "night" || phase === "morning" ? 0.65 : mood === "happy" ? 0.3 : 0.45;
  return rand < yawnRate ? "yawn" : "groom";
}

/** 操作がない状態がこれだけ続くと眠る */
export const SLEEP_AFTER_MS: Record<DayPhaseLike, number> = {
  morning: 120_000,
  day: 180_000,
  evening: 120_000,
  night: 25_000,
};

/** 眠るかどうか。おなかがすいていると眠れない */
export function shouldSleep(phase: DayPhaseLike, idleMs: number, mood: Mood): boolean {
  if (mood === "hungry") return false;
  return idleMs >= SLEEP_AFTER_MS[phase];
}
