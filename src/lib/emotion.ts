/**
 * 期限とねこの喜怒哀楽（純粋関数）。アプリの表情と通知の両方で、同じ決まりを使う。
 *
 * - 期限より早く終えた → 喜（大よろこび）
 * - 期限の日に終えた   → 楽（にっこり）
 * - 期限を過ぎて終えた → 哀（しょんぼり）
 * - 期限を過ぎたまま   → 1日目は哀（しょんぼり）、2日以上で怒（むすっ）
 */
import { daysBetween } from "./comeback";
import type { CatFace } from "@/components/Cat";

/** 何日過ぎたら怒るか */
export const ANGRY_AFTER_DAYS = 2;

export type Emotion = "joy" | "ease" | "sorrow" | "anger";

export const EMOTION_FACE: Record<Emotion, CatFace> = { joy: "joy", ease: "welcome", sorrow: "lonely", anger: "grumpy" };

/** タスクを終えたときの気持ち。期限がなければ喜 */
export function emotionOnComplete(dueDate: string | null, completedDay: string): Emotion {
  if (!dueDate) return "joy";
  const late = daysBetween(dueDate, completedDay);
  if (late === null || late < 0) return "joy";
  return late === 0 ? "ease" : "sorrow";
}

/** 期限を過ぎたまま終わっていないタスクがあるときの気持ち（いちばん遅れているものに合わせる）。なければ null */
export function emotionWhileOverdue(dueDates: (string | null)[], today: string): { emotion: Emotion; days: number; count: number } | null {
  let days = 0;
  let count = 0;
  for (const d of dueDates) {
    if (!d) continue;
    const late = daysBetween(d, today);
    if (late === null || late < 1) continue;
    count++;
    days = Math.max(days, late);
  }
  if (count === 0) return null;
  return { emotion: days >= ANGRY_AFTER_DAYS ? "anger" : "sorrow", days, count };
}

const pick = <T>(list: readonly T[], seed: number) => list[Math.abs(seed) % list.length]!;

/** 終えたときのひとこと */
export function completeLine(emotion: Emotion, seed: number): string {
  switch (emotion) {
    case "joy":
      return pick(["期限より早いにゃ！ さすがにゃ！", "やったにゃ！ ごほうびゲットにゃ！", "えらいにゃ〜！ 余裕のよっちゃんにゃ！"], seed);
    case "ease":
      return pick(["ぴったり間に合ったにゃ〜", "ふう、セーフにゃ。おつかれさまにゃ"], seed);
    default:
      return pick(["おそくなったけど…がんばったにゃ", "間に合わなかったけど、終わってよかったにゃ…"], seed);
  }
}

/** 期限を過ぎたままのときのひとこと */
export function overdueLine(o: { emotion: Emotion; days: number; count: number }): string {
  if (o.emotion === "anger") return `期限から${o.days}日も過ぎてるにゃ！ むすっ`;
  return o.count > 1 ? `期限が過ぎちゃったタスクが${o.count}件あるにゃ…` : "期限が過ぎちゃったにゃ…";
}
