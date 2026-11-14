import { describe, expect, it } from "vitest";
import { nextIdleDelay, pickIdleAction, shouldSleep } from "@/lib/behavior";

describe("ねこのひとり遊び", () => {
  it("待ち時間は12〜24秒", () => {
    expect(nextIdleDelay(0)).toBe(12_000);
    expect(nextIdleDelay(0.5)).toBe(18_000);
    expect(nextIdleDelay(1)).toBeLessThanOrEqual(24_000);
    expect(nextIdleDelay(-1)).toBe(12_000);
  });

  it("おなかがすいているときは何もしない", () => {
    expect(pickIdleAction(0.1, "day", "hungry")).toBeNull();
  });

  it("夜はあくびが多く、ごきげんな昼は毛づくろいが多い", () => {
    expect(pickIdleAction(0.6, "night", "normal")).toBe("yawn");
    expect(pickIdleAction(0.6, "day", "happy")).toBe("groom");
    expect(pickIdleAction(0.2, "day", "happy")).toBe("yawn");
  });

  it("夜は早く眠り、昼はなかなか眠らない。空腹だと眠らない", () => {
    expect(shouldSleep("night", 30_000, "normal")).toBe(true);
    expect(shouldSleep("day", 30_000, "normal")).toBe(false);
    expect(shouldSleep("day", 200_000, "happy")).toBe(true);
    expect(shouldSleep("night", 999_999, "hungry")).toBe(false);
  });
});
