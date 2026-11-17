import { describe, expect, it } from "vitest";
import { EMOTION_FACE, completeLine, emotionOnComplete, emotionWhileOverdue, overdueLine } from "@/lib/emotion";

describe("期限と喜怒哀楽", () => {
  it("終えたとき：早い＝喜、ちょうど＝楽、遅れた＝哀、期限なし＝喜", () => {
    expect(emotionOnComplete("2026-11-20", "2026-11-18")).toBe("joy");
    expect(emotionOnComplete("2026-11-20", "2026-11-20")).toBe("ease");
    expect(emotionOnComplete("2026-11-20", "2026-11-21")).toBe("sorrow");
    expect(emotionOnComplete("2026-11-20", "2026-11-25")).toBe("sorrow");
    expect(emotionOnComplete(null, "2026-11-20")).toBe("joy");
    expect(emotionOnComplete("broken", "2026-11-20")).toBe("joy");
  });
  it("過ぎたまま：1日＝哀、2日以上＝怒。いちばん遅れているものに合わせる", () => {
    expect(emotionWhileOverdue(["2026-11-20", null], "2026-11-20")).toBeNull();
    expect(emotionWhileOverdue(["2026-11-19"], "2026-11-20")).toEqual({ emotion: "sorrow", days: 1, count: 1 });
    expect(emotionWhileOverdue(["2026-11-19", "2026-11-17", "2026-11-25"], "2026-11-20")).toEqual({ emotion: "anger", days: 3, count: 2 });
  });
  it("表情とひとこと", () => {
    expect(EMOTION_FACE).toEqual({ joy: "joy", ease: "welcome", sorrow: "lonely", anger: "grumpy" });
    expect(completeLine("ease", 0)).toBe("ぴったり間に合ったにゃ〜");
    expect(overdueLine({ emotion: "anger", days: 3, count: 2 })).toBe("期限から3日も過ぎてるにゃ！ むすっ");
    expect(overdueLine({ emotion: "sorrow", days: 1, count: 1 })).toBe("期限が過ぎちゃったにゃ…");
    expect(overdueLine({ emotion: "sorrow", days: 1, count: 2 })).toBe("期限が過ぎちゃったタスクが2件あるにゃ…");
  });
});
