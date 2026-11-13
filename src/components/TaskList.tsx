"use client";

import { useCallback, useState } from "react";
import { CalendarIcon, CheckIcon, FoodIcon, PencilIcon, TrashIcon, UndoIcon } from "./Icons";
import { ConfirmDialog } from "./ConfirmDialog";
import { TaskDialog } from "./TaskDialog";
import { useToast } from "./Toast";
import { DIFFICULTIES, FOODS, toDateKey } from "@/lib/game";
import { toMessage, useStore } from "@/lib/store";
import type { Task } from "@/lib/types";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

export function dueLabel(dueDate: string, now: number): { text: string; overdue: boolean } {
  const today = toDateKey(now);
  const tomorrow = toDateKey(now + 86_400_000);
  if (dueDate === today) return { text: "今日まで", overdue: false };
  if (dueDate === tomorrow) return { text: "明日まで", overdue: false };
  const [y, m, d] = dueDate.split("-").map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  const text = `${m}/${d}(${WEEK[dt.getDay()]})`;
  return dueDate < today ? { text: `${text} 期限切れ`, overdue: true } : { text, overdue: false };
}

/** やること：期限が近い順（期限なしは後ろ）→新しい順 */
export function sortTodo(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.status === "todo")
    .sort((a, b) => {
      if (a.dueDate !== b.dueDate) {
        if (a.dueDate === null) return 1;
        if (b.dueDate === null) return -1;
        return a.dueDate < b.dueDate ? -1 : 1;
      }
      return b.createdAt - a.createdAt;
    });
}

export function sortDone(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status === "done").sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

interface Props {
  tasks: Task[];
  /** ホーム用の簡易表示（編集・削除ボタンを出さない） */
  compact?: boolean;
}

export function TaskList({ tasks, compact = false }: Props) {
  const store = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [justDone, setJustDone] = useState<string | null>(null);

  const complete = useCallback(
    async (task: Task) => {
      try {
        setJustDone(task.id);
        const r = await store.completeTask(task.id);
        if (r.granted) {
          toast.show(
            <span className="toast__reward">
              <FoodIcon food={r.granted} size={34} />
              <span>
                <b>おつかれさま！</b>
                <br />
                {FOODS[r.granted].name} を1つ ゲット
              </span>
            </span>,
            "success",
          );
        } else {
          toast.show("完了にしました（ごほうびは受け取り済み）");
        }
      } catch (e) {
        toast.show(toMessage(e), "error");
      } finally {
        window.setTimeout(() => setJustDone(null), 600);
      }
    },
    [store, toast],
  );

  const reopen = useCallback(
    async (task: Task) => {
      try {
        await store.reopenTask(task.id);
        toast.show("やることに戻しました");
      } catch (e) {
        toast.show(toMessage(e), "error");
      }
    },
    [store, toast],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await store.removeTask(deleting.id);
      toast.show("タスクを削除しました");
    } catch (e) {
      toast.show(toMessage(e), "error");
    } finally {
      setDeleting(null);
    }
  }, [deleting, store, toast]);

  return (
    <>
      <ul className="tasks">
        {tasks.map((task) => {
          const d = DIFFICULTIES[task.difficulty];
          const done = task.status === "done";
          const due = task.dueDate && !done ? dueLabel(task.dueDate, store.now) : null;
          return (
            <li key={task.id} className={`task${done ? " task--done" : ""}${justDone === task.id ? " task--pop" : ""}`} data-testid="task-item">
              {done ? (
                <button type="button" className="task__check task__check--done" onClick={() => reopen(task)} aria-label={`「${task.title}」をやることに戻す`}>
                  <CheckIcon />
                </button>
              ) : (
                <button type="button" className="task__check" onClick={() => complete(task)} aria-label={`「${task.title}」を完了にする`}>
                  <CheckIcon />
                </button>
              )}
              <div className="task__main">
                <p className="task__title">{task.title}</p>
                {task.memo && !compact && <p className="task__memo">{task.memo}</p>}
                <div className="task__meta">
                  <span className={`chip chip--${task.difficulty}`}>
                    <FoodIcon food={d.food} size={18} />
                    {d.label}
                  </span>
                  {due && (
                    <span className={`chip chip--due${due.overdue ? " chip--overdue" : ""}`}>
                      <CalendarIcon />
                      {due.text}
                    </span>
                  )}
                  {done && task.completedAt && <span className="chip chip--plain">{toDateKey(task.completedAt).slice(5).replace("-", "/")} 完了</span>}
                </div>
              </div>
              {!compact && (
                <div className="task__actions">
                  {done && (
                    <button type="button" className="icon-btn" onClick={() => reopen(task)} aria-label={`「${task.title}」を戻す`} title="やることに戻す">
                      <UndoIcon />
                    </button>
                  )}
                  <button type="button" className="icon-btn" onClick={() => setEditing(task)} aria-label={`「${task.title}」を編集`} title="編集">
                    <PencilIcon />
                  </button>
                  <button type="button" className="icon-btn icon-btn--danger" onClick={() => setDeleting(task)} aria-label={`「${task.title}」を削除`} title="削除">
                    <TrashIcon />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <TaskDialog open={editing !== null} task={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        title="タスクを削除しますか？"
        confirmLabel="削除する"
        danger
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      >
        <p>「{deleting?.title}」を削除します。元には戻せません。</p>
        {deleting?.rewardClaimed && <p>すでに受け取ったごほうびは、そのまま残ります。</p>}
      </ConfirmDialog>
    </>
  );
}
