"use client";

import { useMemo, useState } from "react";
import { FoodIcon, PlusIcon } from "@/components/Icons";
import { TaskDialog } from "@/components/TaskDialog";
import { TaskList, sortDone, sortTodo } from "@/components/TaskList";
import { DIFFICULTIES, DIFFICULTY_IDS, FOODS } from "@/lib/game";
import { useStore } from "@/lib/store";

type Tab = "todo" | "done";

export default function TasksPage() {
  const { tasks } = useStore();
  const [tab, setTab] = useState<Tab>("todo");
  const [adding, setAdding] = useState(false);
  const todo = useMemo(() => sortTodo(tasks), [tasks]);
  const done = useMemo(() => sortDone(tasks), [tasks]);
  const list = tab === "todo" ? todo : done;

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <p className="page__eyebrow">TASKS</p>
          <h1 className="page__title">タスク</h1>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
          <PlusIcon />
          タスクを追加
        </button>
      </header>

      <ul className="legend" aria-label="むずかしさと ごほうびの対応">
        {DIFFICULTY_IDS.map((id) => {
          const d = DIFFICULTIES[id];
          return (
            <li key={id} className="legend__item">
              <FoodIcon food={d.food} size={30} />
              <span>
                <b>{d.label}</b>
                <small>{FOODS[d.food].name} +{FOODS[d.food].xp}XP</small>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="tabs" role="tablist" aria-label="表示するタスク">
        <button type="button" role="tab" aria-selected={tab === "todo"} className={`tabs__tab${tab === "todo" ? " is-active" : ""}`} onClick={() => setTab("todo")}>
          やること <span className="count-pill">{todo.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "done"} className={`tabs__tab${tab === "done" ? " is-active" : ""}`} onClick={() => setTab("done")}>
          おわった <span className="count-pill">{done.length}</span>
        </button>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          {tab === "todo" ? (
            <>
              <p className="empty__title">やることは ありません</p>
              <p>タスクを追加すると、終えたときに ごはんがもらえます。</p>
              <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
                <PlusIcon size={18} />
                タスクを追加
              </button>
            </>
          ) : (
            <>
              <p className="empty__title">まだ 終えたタスクはありません</p>
              <p>終えたタスクは、ここに並びます。</p>
            </>
          )}
        </div>
      ) : (
        <TaskList tasks={list} />
      )}

      <TaskDialog open={adding} task={null} onClose={() => setAdding(false)} />
    </div>
  );
}
