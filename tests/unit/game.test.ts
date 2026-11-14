import { describe, expect, it } from "vitest";
import {
  FOODS,
  GameError,
  applyFeed,
  applyReward,
  calcStreak,
  createInitialState,
  currentFullness,
  isValidDateKey,
  levelFromXp,
  levelProgress,
  moodOf,
  normalizeCatName,
  normalizeTaskInput,
  affectionOf,
  careNotes,
  moodScore,
  satisfactionOf,
  weekRecord,
  stageForLevel,
  xpForLevel,
} from "@/lib/game";

const T0 = new Date(2026, 10, 13, 10, 0, 0).getTime();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe("レベル計算", () => {
  it("累計XPの境界でレベルが上がる", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(20);
    expect(xpForLevel(5)).toBe(200);
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(19)).toBe(1);
    expect(levelFromXp(20)).toBe(2);
    expect(levelFromXp(59)).toBe(2);
    expect(levelFromXp(60)).toBe(3);
    expect(levelFromXp(-5)).toBe(1);
  });

  it("進捗はレベル内のXPで表す", () => {
    expect(levelProgress(30)).toEqual({ level: 2, current: 10, needed: 40, ratio: 0.25 });
  });

  it("レベルに応じて成長段階が決まる", () => {
    expect(stageForLevel(1).id).toBe("kitten");
    expect(stageForLevel(4).id).toBe("kitten");
    expect(stageForLevel(5).id).toBe("young");
    expect(stageForLevel(10).id).toBe("adult");
    expect(stageForLevel(99).id).toBe("master");
  });
});

describe("満腹度", () => {
  it("時間経過で減り、0未満にならない", () => {
    const cat = { fullness: 50, fullnessAt: T0 };
    expect(currentFullness(cat, T0)).toBe(50);
    expect(currentFullness(cat, T0 + 5 * HOUR)).toBe(35);
    expect(currentFullness(cat, T0 + 100 * HOUR)).toBe(0);
    expect(currentFullness(cat, T0 - HOUR)).toBe(50);
  });

  it("きげんの区分", () => {
    expect(moodOf(10)).toBe("hungry");
    expect(moodOf(30)).toBe("normal");
    expect(moodOf(70)).toBe("happy");
  });
});

describe("報酬とエサやり", () => {
  it("難易度に応じたエサが1つ増える", () => {
    const s = createInitialState(T0);
    expect(applyReward(s, "easy").inventory.kibble).toBe(2);
    expect(applyReward(s, "normal").inventory.fish).toBe(1);
    expect(applyReward(s, "hard").inventory.feast).toBe(1);
    expect(s.inventory).toEqual({ kibble: 1, fish: 0, feast: 0 }); // 元は変更しない
  });

  it("エサを与えると在庫が減りXPと満腹度が増える", () => {
    const s = createInitialState(T0);
    const { state, outcome } = applyFeed(s, "kibble", T0);
    expect(state.inventory.kibble).toBe(0);
    expect(state.cat.xp).toBe(FOODS.kibble.xp);
    expect(state.cat.fullness).toBe(65);
    expect(state.cat.totalFeeds).toBe(1);
    expect(outcome.levelAfter).toBe(1);
  });

  it("在庫がないエサは与えられない", () => {
    const s = createInitialState(T0);
    expect(() => applyFeed(s, "feast", T0)).toThrowError(GameError);
  });

  it("レベルアップと進化を検出する", () => {
    const s = createInitialState(T0);
    s.cat.xp = 190;
    s.inventory.fish = 1;
    const { outcome } = applyFeed(s, "fish", T0);
    expect(outcome.levelBefore).toBe(4);
    expect(outcome.levelAfter).toBe(5);
    expect(outcome.stageBefore).toBe("kitten");
    expect(outcome.stageAfter).toBe("young");
  });

  it("満腹度は100を超えない", () => {
    const s = createInitialState(T0);
    s.cat.fullness = 90;
    s.inventory.feast = 1;
    expect(applyFeed(s, "feast", T0).state.cat.fullness).toBe(100);
  });
});

describe("連続達成日数", () => {
  it("今日まで続く日数を数える", () => {
    expect(calcStreak([T0, T0 - DAY, T0 - 2 * DAY], T0)).toBe(3);
  });
  it("今日が未達成でも昨日まで続いていれば維持", () => {
    expect(calcStreak([T0 - DAY, T0 - 2 * DAY], T0)).toBe(2);
  });
  it("途切れていれば0", () => {
    expect(calcStreak([T0 - 3 * DAY], T0)).toBe(0);
    expect(calcStreak([], T0)).toBe(0);
  });
  it("同じ日の複数完了は1日と数える", () => {
    expect(calcStreak([T0, T0 + HOUR, T0 - DAY], T0)).toBe(2);
  });
});

describe("入力検証", () => {
  it("前後の空白を除去する", () => {
    const v = normalizeTaskInput({ title: "  そうじ ", memo: " a ", difficulty: "easy", dueDate: "" as unknown as null });
    expect(v).toEqual({ title: "そうじ", memo: "a", difficulty: "easy", dueDate: null });
  });
  it("空・長すぎ・不正な日付を拒否する", () => {
    const base = { memo: "", difficulty: "easy" as const, dueDate: null };
    expect(() => normalizeTaskInput({ ...base, title: "   " })).toThrowError(GameError);
    expect(() => normalizeTaskInput({ ...base, title: "あ".repeat(61) })).toThrowError(GameError);
    expect(() => normalizeTaskInput({ ...base, title: "a", dueDate: "2026-02-30" })).toThrowError(GameError);
    expect(isValidDateKey("2026-11-13")).toBe(true);
  });
  it("ねこの名前", () => {
    expect(normalizeCatName(" たま ")).toBe("たま");
    expect(() => normalizeCatName("")).toThrowError(GameError);
    expect(() => normalizeCatName("あ".repeat(13))).toThrowError(GameError);
  });
});

describe("きげん・なつき度・満足度", () => {
  it("なつき度はなでた回数とごはんの回数で上がり、100で止まる", () => {
    expect(affectionOf({ petCount: 0, totalFeeds: 0 })).toBe(0);
    expect(affectionOf({ petCount: 10, totalFeeds: 5 })).toBe(20);
    expect(affectionOf({ petCount: 500, totalFeeds: 0 })).toBe(100);
  });
  it("きげんは満腹度が土台で、なでる・タスク完了で上がる", () => {
    expect(moodScore(50, undefined, 0, T0)).toBe(30);
    expect(moodScore(50, T0, 0, T0)).toBe(50); // なでた直後 +20
    expect(moodScore(50, T0 - 3 * HOUR, 0, T0)).toBe(40); // 3時間後は半分
    expect(moodScore(50, T0 - 7 * HOUR, 0, T0)).toBe(30); // 6時間で消える
    expect(moodScore(50, undefined, 1, T0)).toBe(40);
    expect(moodScore(50, undefined, 9, T0)).toBe(50); // タスクは最大+20
    expect(moodScore(100, T0, 5, T0)).toBe(100);
  });
  it("満足度は3つの平均", () => {
    expect(satisfactionOf(80, 92, 76)).toBe(83);
  });
});

describe("今週の記録", () => {
  // T0 = 2026-11-13（金）
  it("月曜はじまりの7日ぶんを返す", () => {
    const w = weekRecord([T0, T0 - 2 * DAY, T0 - 6 * DAY], T0);
    expect(w.map((d) => d.label).join("")).toBe("月火水木金土日");
    expect(w[0]!.dateKey).toBe("2026-11-09");
    expect(w.map((d) => d.done)).toEqual([false, false, true, false, true, false, false]); // 6日前は先週なので含まない
    expect(w[4]).toMatchObject({ isToday: true, isFuture: false });
    expect(w[5]!.isFuture).toBe(true);
  });
  it("日曜日でも同じ週の月曜から始まる", () => {
    const sunday = new Date(2026, 10, 15, 9).getTime();
    const w = weekRecord([], sunday);
    expect(w[0]!.dateKey).toBe("2026-11-09");
    expect(w[6]!.isToday).toBe(true);
  });
});

describe("育成メモ", () => {
  const base = { fullness: 60, mood: 70, affection: 30, fedToday: 0, doneToday: 0, todoCount: 0, streak: 0, foodTotal: 0 };
  it("状態に合ったメモを最大3つ返す", () => {
    expect(careNotes({ ...base, fedToday: 2, mood: 40 })).toEqual(["今日はよく食べた", "なでるとごきげんアップ"]);
    expect(careNotes({ ...base, fullness: 10, foodTotal: 2 })[0]).toContain("ごはんをあげましょう");
    expect(careNotes({ ...base, fullness: 10 })[0]).toContain("タスクを終えて");
    expect(careNotes({ ...base, fedToday: 3, streak: 7, doneToday: 2, mood: 30 }).length).toBe(3);
    expect(careNotes({ ...base, streak: 7 })).toContain("7日つづけてタスクを達成中");
  });
});
