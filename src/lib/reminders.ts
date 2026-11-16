/**
 * 期限の通知（純粋関数）。
 * 期限は日付だけなので「前日」と「当日」の、設定した時刻を過ぎたら1回ずつ知らせる。
 */
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

/** 通知の文面（複数件はまとめて1つにする） */
export function reminderMessage(list: Reminder[], catName: string): { title: string; body: string } {
  const today = list.filter((r) => r.kind === "today");
  const tomorrow = list.filter((r) => r.kind === "tomorrow");
  const names = (rs: Reminder[]) => rs.slice(0, 3).map((r) => `「${r.task.title}」`).join("") + (rs.length > 3 ? ` ほか${rs.length - 3}件` : "");
  const title = today.length > 0 ? `今日までのタスクが${today.length}件あるにゃ` : `明日までのタスクが${tomorrow.length}件あるにゃ`;
  const lines: string[] = [];
  if (today.length) lines.push(`今日まで：${names(today)}`);
  if (tomorrow.length) lines.push(`明日まで：${names(tomorrow)}`);
  lines.push(`終わらせて、${catName}にごはんをあげよう`);
  return { title, body: lines.join("\n") };
}
