"use client";

import { useMemo } from "react";
import { Cat } from "@/components/Cat";
import { CheckIcon, FlameIcon, FoodIcon, HeartIcon, PawIcon } from "@/components/Icons";
import { FOODS, STAGES, calcStreak, levelFromXp, stageForLevel, toDateKey } from "@/lib/game";
import { useStore } from "@/lib/store";
import type { GameEvent } from "@/lib/types";

function when(at: number, now: number): string {
  const d = new Date(at);
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  const key = toDateKey(at);
  if (key === toDateKey(now)) return `今日 ${hm}`;
  if (key === toDateKey(now - 86_400_000)) return `昨日 ${hm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}

function describe(e: GameEvent, name: string): string {
  switch (e.type) {
    case "reward":
      return `「${e.taskTitle ?? "タスク"}」を終えて ${e.foodId ? FOODS[e.foodId].name : "ごはん"} をゲット`;
    case "feed":
      return `${name}に ${e.foodId ? FOODS[e.foodId].name : "ごはん"} をあげた`;
    case "levelup":
      return `${name}が Lv.${e.level ?? "?"} になった`;
    case "evolve":
      return `${name}が「${STAGES.find((s) => s.id === e.stage)?.name ?? "?"}」に成長した`;
  }
}

export default function RecordsPage() {
  const { tasks, game, events, now } = useStore();
  const cat = game!.cat;
  const level = levelFromXp(cat.xp);
  const current = stageForLevel(level);
  const doneTasks = useMemo(() => tasks.filter((t) => t.completedAt !== null), [tasks]);
  const streak = useMemo(() => calcStreak(doneTasks.map((t) => t.completedAt!), now), [doneTasks, now]);
  const todayCount = doneTasks.filter((t) => toDateKey(t.completedAt!) === toDateKey(now)).length;
  const days = Math.max(1, Math.floor((now - cat.bornAt) / 86_400_000) + 1);

  const stats = [
    { label: "今日おえたタスク", value: todayCount, unit: "件", Icon: CheckIcon, tone: "leaf" },
    { label: "つづけた日数", value: streak, unit: "日", Icon: FlameIcon, tone: "accent" },
    { label: "あげたごはん", value: cat.totalFeeds, unit: "回", Icon: PawIcon, tone: "sun" },
    { label: "なでた回数", value: cat.petCount, unit: "回", Icon: HeartIcon, tone: "pink" },
  ] as const;

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">きろく</h1>
        </div>
        <p className="page__note">
          {cat.name}と くらして <b>{days}</b>日目
        </p>
      </header>

      <ul className="stats">
        {stats.map(({ label, value, unit, Icon, tone }) => (
          <li key={label} className={`stat stat--${tone}`}>
            <span className="stat__icon">
              <Icon size={20} />
            </span>
            <span className="stat__label">{label}</span>
            <span className="stat__value">
              {value}
              <small>{unit}</small>
            </span>
          </li>
        ))}
      </ul>

      <section className="card">
        <h2 className="card__title">せいちょう図鑑</h2>
        <ol className="album">
          {STAGES.map((s) => {
            const unlocked = level >= s.minLevel;
            return (
              <li key={s.id} className={`album__item${unlocked ? "" : " is-locked"}${s.id === current.id ? " is-current" : ""}`}>
                <div className="album__pic">
                  <Cat stage={s.id} face="happy" animated={false} silhouette={!unlocked} title={unlocked ? s.name : "まだ見ぬ姿"} />
                </div>
                <p className="album__name">{unlocked ? s.name : "？？？"}</p>
                <p className="album__lv">Lv.{s.minLevel}〜</p>
                {s.id === current.id && <span className="album__now">いまの姿</span>}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="card">
        <h2 className="card__title">さいきんのできごと</h2>
        {events.length === 0 ? (
          <p className="muted">まだ できごとは ありません。タスクを終えたり、ごはんをあげたりすると ここに残ります。</p>
        ) : (
          <ol className="log">
            {events.map((e) => (
              <li key={e.id ?? `${e.type}-${e.at}`} className={`log__item log__item--${e.type}`}>
                <span className="log__icon" aria-hidden>
                  {e.foodId ? <FoodIcon food={e.foodId} size={26} /> : <PawIcon size={18} />}
                </span>
                <span className="log__text">{describe(e, cat.name)}</span>
                <time className="log__time" dateTime={new Date(e.at).toISOString()}>
                  {when(e.at, now)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
