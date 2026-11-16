import { describe, expect, it } from "vitest";
import { findDueDate, parseImportText } from "@/lib/importTasks";
import { dueReminders, reminderKey, reminderMessage } from "@/lib/reminders";
import { GameError } from "@/lib/game";
import type { Task } from "@/lib/types";

// 2026-11-16（月）10:00
const NOW = new Date(2026, 10, 16, 10, 0, 0).getTime();

describe("タスクの取り込み：JSON", () => {
  it("プラグインの形式を読む", () => {
    const r = parseImportText(JSON.stringify({ app: "gohobi-neko", type: "tasks", tasks: [
      { title: "資料を送る", memo: "部長にも", difficulty: "hard", dueDate: "2026-11-20" },
      { title: "牛乳を買う" },
    ] }), NOW);
    expect(r.format).toBe("json");
    expect(r.tasks).toEqual([
      { title: "資料を送る", memo: "部長にも", difficulty: "hard", dueDate: "2026-11-20" },
      { title: "牛乳を買う", memo: "", difficulty: "normal", dueDate: null },
    ]);
  });
  it("```json の囲みや前後の説明があっても読める。配列だけでもよい", () => {
    const r = parseImportText('タスクを抽出しました。\n```json\n[{"title":"A"},"B"]\n```\n以上です', NOW);
    expect(r.tasks.map((t) => t.title)).toEqual(["A", "B"]);
  });
  it("壊れた項目は飛ばし、理由を残す。不正な期限は期限なしにする", () => {
    const r = parseImportText(JSON.stringify([{ title: "" }, { foo: 1 }, { title: "OK", dueDate: "2026-02-30", difficulty: "たいへん" }]), NOW);
    expect(r.tasks).toEqual([{ title: "OK", memo: "", difficulty: "hard", dueDate: null }]);
    expect(r.skipped).toHaveLength(3);
  });
  it("壊れたJSON・空・大きすぎる入力は拒否する", () => {
    expect(() => parseImportText("{ broken", NOW)).toThrowError(GameError);
    expect(() => parseImportText('{"tasks":[]}', NOW)).toThrowError(GameError);
    expect(() => parseImportText("   \n  ", NOW)).toThrowError(GameError);
    expect(() => parseImportText("a".repeat(50_001), NOW)).toThrowError(GameError);
  });
  it("101件以上は100件で打ち切る", () => {
    const r = parseImportText(JSON.stringify(Array.from({ length: 120 }, (_, i) => ({ title: `t${i}` }))), NOW);
    expect(r.tasks).toHaveLength(100);
    expect(r.skipped.at(-1)).toContain("20件");
  });
});

describe("タスクの取り込み：テキスト", () => {
  it("箇条書き・チェックボックス・番号を取り除き、完了済みと見出しは飛ばす", () => {
    const r = parseImportText(["# 今週", "- 洗濯", "・そうじ", "□ 買い物", "[ ] 返信", "[x] 済んだこと", "1. 企画書", "② 予約", "", "---"].join("\n"), NOW);
    expect(r.format).toBe("text");
    expect(r.tasks.map((t) => t.title)).toEqual(["洗濯", "そうじ", "買い物", "返信", "企画書", "予約"]);
    expect(r.skipped).toHaveLength(1);
  });
  it("期限の表現を日付にして、タイトルから取り除く", () => {
    const r = parseImportText(["資料作成 11/20まで", "請求書（12月3日）", "明日までに電話", "金曜 定例の準備", "2027-01-05 年賀状の返事"].join("\n"), NOW);
    expect(r.tasks.map((t) => [t.title, t.dueDate])).toEqual([
      ["資料作成", "2026-11-20"],
      ["請求書", "2026-12-03"],
      ["電話", "2026-11-17"],
      ["定例の準備", "2026-11-20"],
      ["年賀状の返事", "2027-01-05"],
    ]);
  });
  it("月日の年は、今日以降の近いほう（30日以内の過去は今年＝期限切れ）", () => {
    expect(findDueDate("1/10 予約", NOW).dueDate).toBe("2027-01-10");
    expect(findDueDate("11/10 振込", NOW).dueDate).toBe("2026-11-10");
    expect(findDueDate("2/30 ありえない", NOW).dueDate).toBeNull();
  });
});

const task = (over: Partial<Task>): Task => ({
  id: "t1", title: "資料", memo: "", difficulty: "normal", dueDate: null, status: "todo",
  rewardClaimed: false, createdAt: NOW, updatedAt: NOW, completedAt: null, ...over,
});

describe("期限の通知", () => {
  const on = { enabled: true, hour: 9 };
  const tasks = [
    task({ id: "a", title: "今日の", dueDate: "2026-11-16" }),
    task({ id: "b", title: "明日の", dueDate: "2026-11-17" }),
    task({ id: "c", title: "あさって", dueDate: "2026-11-18" }),
    task({ id: "d", title: "完了済み", dueDate: "2026-11-16", status: "done" }),
    task({ id: "e", title: "期限なし" }),
  ];
  it("今日と明日の期限の未完了タスクだけ、今日を先に返す", () => {
    expect(dueReminders(tasks, on, [], NOW).map((r) => [r.task.id, r.kind])).toEqual([["a", "today"], ["b", "tomorrow"]]);
  });
  it("オフのとき・設定時刻より前・通知済みは返さない", () => {
    expect(dueReminders(tasks, { ...on, enabled: false }, [], NOW)).toEqual([]);
    expect(dueReminders(tasks, { ...on, hour: 11 }, [], NOW)).toEqual([]);
    expect(dueReminders(tasks, on, [reminderKey(tasks[0]!, "today")], NOW).map((r) => r.task.id)).toEqual(["b"]);
  });
  it("期限を変えたら、新しい期限でもう一度知らせる", () => {
    const moved = { ...tasks[0]!, dueDate: "2026-11-17" };
    expect(dueReminders([moved], on, [reminderKey(tasks[0]!, "today")], NOW)[0]?.kind).toBe("tomorrow");
  });
  it("文面は件数をまとめる", () => {
    const m = reminderMessage(dueReminders(tasks, on, [], NOW), "たま");
    expect(m.title).toBe("今日までのタスクが1件あるにゃ");
    expect(m.body).toContain("今日まで：「今日の」");
    expect(m.body).toContain("明日まで：「明日の」");
  });
});
