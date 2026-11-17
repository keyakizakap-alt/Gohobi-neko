/**
 * 期限の通知（純粋関数）。
 * 期限は日付だけなので「前日」と「当日」の、設定した時刻を過ぎたら1回ずつ知らせる。
 */
import { NOTIFY_IMAGE } from "./comeback";
import { toDateKey } from "./game";
import type { NotifySettings, Task } from "./types";

export type ReminderKind = "tomorrow" | "today";

export interface Reminder {
  key: string;
  kind: ReminderKind;
  task: Task;
}

export const reminderKey = (task: Pick<Task, "id" | "dueDate">, kind: ReminderKind) => `${task.id}:${task.dueDate}:${kind}`;

/** いま知らせるべき通知の一覧（通知済みのものは除く） */
export function dueReminders(tasks: Task[], settings: NotifySettings, notified: string[], now: number): Reminder[] {
  if (!settings.enabled) return [];
  const d = new Date(now);
  if (d.getHours() < settings.hour) return [];
  const today = toDateKey(now);
  const noon = new Date(now);
  noon.setHours(12, 0, 0, 0);
  const tomorrow = toDateKey(noon.getTime() + 86_400_000);
  const sent = new Set(notified);
  const out: Reminder[] = [];
  for (const task of tasks) {
    if (task.status !== "todo" || !task.dueDate) continue;
    const kind: ReminderKind | null = task.dueDate === today ? "today" : task.dueDate === tomorrow ? "tomorrow" : null;
    if (!kind) continue;
    const key = reminderKey(task, kind);
    if (!sent.has(key)) out.push({ key, kind, task });
  }
  // 今日のものを先に
  return out.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "today" ? -1 : 1));
}

/**
 * 通知の文面（複数件はまとめて1つにする）。showTitles が false のときはタスク名を出さない。
 * 期限切れがあれば、ねこは「ご機嫌ななめ」。今日・明日だけなら、にっこり応援する。
 */
export function formatReminder(
  today: string[],
  tomorrow: string[],
  catName: string,
  showTitles = true,
  overdue: string[] = [],
): { title: string; body: string; image: string } {
  const names = (list: string[]) =>
    list.slice(0, 3).map((t) => `「${t}」`).join("") + (list.length > 3 ? ` ほか${list.length - 3}件` : "");
  const lines: string[] = [];
  if (overdue.length) {
    lines.push(showTitles ? `期限切れ：${names(overdue)}` : `期限が過ぎたタスクが${overdue.length}件あるにゃ`);
    if (today.length) lines.push(showTitles ? `今日まで：${names(today)}` : `今日までのタスクも${today.length}件あります`);
    lines.push(`終わらせて、${catName}のきげんを直してあげて`);
    return { title: `${catName}が ご機嫌ななめにゃ`, body: lines.join("\n"), image: NOTIFY_IMAGE.grumpy };
  }
  const title = today.length > 0 ? `今日までのタスクが${today.length}件あるにゃ` : `明日までのタスクが${tomorrow.length}件あるにゃ`;
  if (showTitles) {
    if (today.length) lines.push(`今日まで：${names(today)}`);
    if (tomorrow.length) lines.push(`明日まで：${names(tomorrow)}`);
  } else if (today.length && tomorrow.length) {
    lines.push(`明日までのタスクも${tomorrow.length}件あります`);
  }
  lines.push(`${catName}が応援してるにゃ。終わったら、ごはんをちょうだい`);
  return { title, body: lines.join("\n"), image: NOTIFY_IMAGE.welcome };
}

export function reminderMessage(list: Reminder[], catName: string, showTitles = true): { title: string; body: string; image: string } {
  return formatReminder(
    list.filter((r) => r.kind === "today").map((r) => r.task.title),
    list.filter((r) => r.kind === "tomorrow").map((r) => r.task.title),
    catName,
    showTitles,
  );
}
