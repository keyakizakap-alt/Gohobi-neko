"use client";

import { useMemo, useState } from "react";
import { FoodIcon, PlusIcon } from "@/components/Icons";
import { TaskDialog } from "@/components/TaskDialog";
import { FilterTabs, TaskList, filterTasks, type TaskFilter } from "@/components/TaskList";
import { DIFFICULTIES, DIFFICULTY_IDS, FOODS } from "@/lib/game";
import { useStore } from "@/lib/store";

export default function TasksPage() {
  const { tasks } = useStore();
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [adding, setAdding] = useState(false);
  const list = useMemo(() => filterTasks(tasks, filter), [tasks, filter]);
  const counts = useMemo(() => {
    const done = tasks.filter((t) => t.status === "done").length;
    return { all: tasks.length, todo: tasks.length - done, done };
  }, [tasks]);

  return (
    <div className="page">
      <header className="page__head">
        <h1 className="page__title">タスク管理</h1>
        <button type="button" className="btn btn--primary page__add" onClick={() => setAdding(true)}>
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
                <small>
                  {FOODS[d.food].name} +{FOODS[d.food].xp}XP
                </small>
              </span>
            </li>
          );
        })}
      </ul>

      <FilterTabs value={filter} onChange={setFilter} counts={counts} />

      {list.length === 0 ? (
        <div className="empty">
          {filter === "done" ? (
            <>
              <p className="empty__title">まだ 終えたタスクはありません</p>
              <p>終えたタスクは、ここに並びます。</p>
            </>
          ) : (
            <>
              <p className="empty__title">{filter === "todo" && tasks.length > 0 ? "ぜんぶ おわりました！" : "タスクは まだありません"}</p>
              <p>タスクを追加すると、終えたときに ごはんがもらえます。</p>
              <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
                <PlusIcon size={18} />
                タスクを追加
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="card card--list">
          <TaskList tasks={list} />
        </div>
      )}

      <button type="button" className="fab" onClick={() => setAdding(true)} aria-label="タスクを追加">
        <PlusIcon size={28} />
      </button>

      <TaskDialog open={adding} task={null} onClose={() => setAdding(false)} />
    </div>
  );
}
