"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CatRoom, phaseOf, type DayPhase } from "@/components/CatRoom";
import { BowlIcon, CalendarIcon, CatFaceIcon, CheckIcon, ClipboardIcon, FlameIcon, FoodIcon, HeartIcon, NoteIcon, PawIcon, PlusIcon, SunIcon } from "@/components/Icons";
import { LevelUpDialog } from "@/components/LevelUpDialog";
import { Meter } from "@/components/Meter";
import { TaskDialog } from "@/components/TaskDialog";
import { FilterTabs, TaskList, filterTasks, todaysTasks, type TaskFilter } from "@/components/TaskList";
import { useToast } from "@/components/Toast";
import {
  FOODS,
  FOOD_IDS,
  affectionOf,
  calcStreak,
  careNotes,
  currentFullness,
  levelProgress,
  moodOf,
  moodScore,
  nextStage,
  satisfactionOf,
  stageForLevel,
  toDateKey,
  weekRecord,
  type Mood,
} from "@/lib/game";
import { ACTION_MS, nextIdleDelay, pickIdleAction, shouldSleep, type IdleAction } from "@/lib/behavior";
import { toMessage, useStore } from "@/lib/store";
import type { FeedOutcome, FoodId } from "@/lib/types";

const EAT_MS = 1700;
const HOME_TASK_LIMIT = 6;

function idleLine(mood: Mood, todo: number, foodTotal: number, seed: number): string {
  const pick = (list: string[]) => list[seed % list.length]!;
  if (mood === "hungry") {
    return foodTotal > 0 ? pick(["おなか すいたにゃ…", "ごはん、まだかにゃ？"]) : pick(["おなか ぺこぺこ…", "やることを終えると ごはんがもらえるにゃ"]);
  }
  if (foodTotal > 0) return pick(["いいにおいが するにゃ", "ごはん、たべたいにゃ〜"]);
  if (todo > 0) return pick([`やること ${todo}こ、おうえんしてるにゃ`, "ひとつずつで だいじょうぶにゃ", "おわったら ごはんにゃ！"]);
  return mood === "happy" ? pick(["ごろごろ…しあわせにゃ", "きょうも おつかれさまにゃ"]) : pick(["のんびり するにゃ〜", "なでても いいにゃ"]);
}

const PET_LINES = ["ごろごろ…", "にゃ〜ん", "そこ、きもちいいにゃ", "もっと なでてにゃ"];
const EAT_LINES = ["もぐもぐ…おいしいにゃ！", "うまうま…", "しあわせの あじにゃ〜"];
const IDLE_LINES: Record<IdleAction, string> = { yawn: "ふあぁ〜…", groom: "ぺろぺろ…" };
const WAKE_LINE = "…はっ、おはようにゃ";

export default function HomePage() {
  const store = useStore();
  const toast = useToast();
  const game = store.game!;
  const { cat, inventory } = game;

  const [phase, setPhase] = useState<DayPhase>("day");
  const [eating, setEating] = useState<FoodId | null>(null);
  const [xpPop, setXpPop] = useState<{ key: number; amount: number } | null>(null);
  const [hearts, setHearts] = useState(0);
  const [petted, setPetted] = useState(false);
  const [idleAction, setIdleAction] = useState<IdleAction | null>(null);
  const [sleeping, setSleeping] = useState(false);
  const lastActive = useRef(Date.now());
  const [line, setLine] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<FeedOutcome | null>(null);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const busy = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setPhase(phaseOf(new Date(store.now)));
  }, [store.now]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const progress = levelProgress(cat.xp);
  const stage = stageForLevel(progress.level);
  const upcoming = nextStage(progress.level);
  const fullness = currentFullness(cat, store.now);
  const mood = moodOf(fullness);
  const foodTotal = FOOD_IDS.reduce((n, f) => n + inventory[f], 0);
  const today = toDateKey(store.now);

  const derived = useMemo(() => {
    const todays = todaysTasks(store.tasks, store.now);
    const completedAts = store.tasks.filter((t) => t.completedAt !== null).map((t) => t.completedAt!);
    const doneToday = todays.filter((t) => t.status === "done").length;
    return {
      todays,
      doneToday,
      todoCount: todays.length - doneToday,
      streak: calcStreak(completedAts, store.now),
      week: weekRecord(completedAts, store.now),
    };
  }, [store.tasks, store.now]);
  const { todays, doneToday, todoCount, streak, week } = derived;
  const todo = { length: todoCount };

  const moodValue = moodScore(fullness, cat.lastPetAt, doneToday, store.now);
  const affection = affectionOf(cat);
  const satisfaction = satisfactionOf(fullness, moodValue, affection);
  const fedToday = store.events.filter((e) => e.type === "feed" && toDateKey(e.at) === today).length;
  const notes = careNotes({ fullness, mood: moodValue, affection, fedToday, doneToday, todoCount, streak, foodTotal });
  const shown = filterTasks(todays, filter);

  const bubble = line ?? (idleAction ? IDLE_LINES[idleAction] : sleeping ? "すや すや…" : null) ?? idleLine(mood, todo.length, foodTotal, new Date(store.now).getHours() + todo.length);
  const face = eating ? "eating" : petted ? "happy" : idleAction ?? (sleeping ? "sleep" : mood);

  // 画面のどこかを触ったら「起きている」扱いにする
  useEffect(() => {
    const mark = () => {
      lastActive.current = Date.now();
    };
    window.addEventListener("pointerdown", mark);
    window.addEventListener("keydown", mark);
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
    };
  }, []);

  // ひとり遊び：何もしていないとき、ときどき あくび・毛づくろい をし、しばらく放っておくと眠る
  const stateRef = useRef({ phase, mood, eating, petted, idleAction, sleeping });
  stateRef.current = { phase, mood, eating, petted, idleAction, sleeping };
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const st = stateRef.current;
      const quiet = !st.eating && !st.petted && !st.idleAction && !busy.current && document.visibilityState === "visible";
      if (quiet && !st.sleeping) {
        if (shouldSleep(st.phase, Date.now() - lastActive.current, st.mood)) {
          setSleeping(true);
        } else {
          const action = pickIdleAction(Math.random(), st.phase, st.mood);
          if (action) {
            setIdleAction(action);
            window.setTimeout(() => setIdleAction(null), ACTION_MS[action]);
          }
        }
      }
      timer = window.setTimeout(tick, nextIdleDelay(Math.random()));
    };
    timer = window.setTimeout(tick, nextIdleDelay(Math.random()));
    return () => window.clearTimeout(timer);
  }, []);

  const say = useCallback(
    (text: string, ms: number) => {
      setLine(text);
      later(() => setLine((cur) => (cur === text ? null : cur)), ms);
    },
    [later],
  );

  const onFeed = useCallback(
    async (foodId: FoodId) => {
      if (busy.current) return;
      busy.current = true;
      try {
        const r = await store.feed(foodId);
        setSleeping(false);
        setIdleAction(null);
        setEating(foodId);
        // スマホでは「ごはん」ボタンの位置からねこが見えないことがあるので、部屋まで戻す
        document.getElementById("cat-room")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        setXpPop({ key: Date.now(), amount: r.outcome.xpGained });
        setHearts((n) => n + 1);
        say(EAT_LINES[r.state.cat.totalFeeds % EAT_LINES.length]!, EAT_MS + 600);
        later(() => {
          setEating(null);
          busy.current = false;
          if (r.outcome.levelAfter > r.outcome.levelBefore) setCelebration(r.outcome);
        }, EAT_MS);
      } catch (e) {
        busy.current = false;
        toast.show(toMessage(e), "error");
      }
    },
    [store, toast, say, later],
  );

  const onPet = useCallback(() => {
    if (sleeping) {
      // 眠っているときは、なでると目をさまして あくびをする
      setSleeping(false);
      setIdleAction("yawn");
      later(() => setIdleAction(null), ACTION_MS.yawn);
      say(WAKE_LINE, ACTION_MS.yawn + 600);
      store.pet().catch(() => undefined);
      return;
    }
    setIdleAction(null);
    setHearts((n) => n + 1);
    setPetted(true);
    later(() => setPetted(false), 1200);
    say(PET_LINES[cat.petCount % PET_LINES.length]!, 1800);
    store.pet().catch(() => undefined); // なでた回数は記録できなくても遊びを止めない
  }, [cat.petCount, later, say, store, sleeping]);

  return (
    <div className="dash">
      <header className="dash__head">
        <SunIcon />
        <h1 className="dash__title">今日のダッシュボード</h1>
      </header>

      <ul className="stats dash__tiles">
        <li className="stat stat--leaf">
          <span className="stat__icon">
            <CheckIcon size={22} />
          </span>
          <span className="stat__label">完了タスク</span>
          <span className="stat__value" data-testid="tile-done">
            {doneToday}
          </span>
        </li>
        <li className="stat stat--sun">
          <span className="stat__icon">
            <BowlIcon size={22} />
          </span>
          <span className="stat__label">エサ</span>
          <span className="stat__value" data-testid="tile-food">
            {foodTotal}
          </span>
        </li>
        <li className="stat stat--accent">
          <span className="stat__icon">
            <FlameIcon size={22} />
          </span>
          <span className="stat__label">連続達成</span>
          <span className="stat__value">
            {streak}
            <small>日</small>
          </span>
        </li>
        <li className="stat stat--pink">
          <span className="stat__icon">
            <HeartIcon size={22} />
          </span>
          <span className="stat__label">ねこ満足度</span>
          <span className="stat__value">
            {satisfaction}
            <small>%</small>
          </span>
        </li>
      </ul>

      <section className="card roomcard" aria-label="ねこの部屋">
        <h2 className="card__title roomcard__title">
          <CatFaceIcon className="card__icon" />
          ねこの部屋
        </h2>

        <div className="roomcard__scene">
          <CatRoom
            name={cat.name}
            stage={stage.id}
            face={face}
            phase={phase}
            bubble={bubble}
            eatingFood={eating}
            heartBurst={hearts}
            xpPop={xpPop}
            onPet={onPet}
            overlay={
              <div className="lvcard">
                <p className="lvcard__name">
                  <b data-testid="cat-name">{cat.name}</b>
                  <span className="lvcard__stage">{stage.name}</span>
                </p>
                <p className="lvcard__level" aria-label={`レベル${progress.level}`}>
                  Lv. <span data-testid="cat-level">{progress.level}</span>
                </p>
                <div className="lvcard__bar" role="progressbar" aria-label="つぎのレベルまで" aria-valuemin={0} aria-valuemax={progress.needed} aria-valuenow={progress.current}>
                  <i style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
                </div>
                <p className="lvcard__xp">
                  <span>つぎのレベルまで</span>
                  <span data-testid="xp-value">
                    {progress.current} / {progress.needed} XP
                  </span>
                </p>
              </div>
            }
          />
        </div>

        <div className="roomcard__pantry">
          <div className="pantry__list">
            {FOOD_IDS.map((id) => {
              const f = FOODS[id];
              const count = inventory[id];
              return (
                <button
                  key={id}
                  type="button"
                  className="food"
                  disabled={count < 1 || eating !== null}
                  onClick={() => onFeed(id)}
                  aria-label={`${f.name}をあげる（のこり${count}こ）`}
                  data-testid={`feed-${id}`}
                >
                  <FoodIcon food={id} size={44} />
                  <span className="food__name">{f.name}</span>
                  <span className="food__xp">+{f.xp} XP</span>
                  <span className="food__count" data-testid={`count-${id}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="pantry__hint">
            <BowlIcon size={18} />
            {foodTotal > 0 ? `ごはん：あと${foodTotal}回あげられます` : "タスクを終えると、ごはんがもらえます"}
          </p>
        </div>

        <div className="roomcard__meters">
          <Meter label="おなか" tone="food" ratio={fullness / 100} valueText={`${fullness}%`} icon={<BowlIcon size={18} />} testId="fullness-value" />
          <Meter label="きげん" tone="mood" ratio={moodValue / 100} valueText={`${moodValue}%`} icon={<CatFaceIcon size={18} />} testId="mood-value" />
          <Meter label="なつき度" tone="love" ratio={affection / 100} valueText={`${affection}%`} icon={<HeartIcon size={18} />} testId="affection-value" />
          <p className="roomcard__next">
            <PawIcon size={15} />
            {upcoming ? (
              <span>
                Lv.{upcoming.minLevel} で <b>「{upcoming.name}」</b> に成長します
              </span>
            ) : (
              <span>さいごの姿まで育ちました</span>
            )}
          </p>
        </div>
      </section>

      <section className="card taskcard" aria-label="今日のタスク">
        <div className="card__head">
          <h2 className="card__title">
            <ClipboardIcon className="card__icon" />
            今日のタスク
            <small className="card__sub">
              （{doneToday}/{todays.length} 完了）
            </small>
          </h2>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setAdding(true)}>
            <PlusIcon size={18} />
            <span>
              <span className="only-wide">タスクを</span>追加
            </span>
          </button>
        </div>

        <div className="taskcard__bar">
          <FilterTabs value={filter} onChange={setFilter} />
          <p className="hint-pill">
            <PawIcon size={15} />
            タスク完了でエサを獲得
          </p>
        </div>

        {shown.length === 0 ? (
          <div className="empty empty--inline">
            {todays.length === 0 ? (
              <>
                <p className="empty__title">今日のタスクは ありません</p>
                <p>タスクを追加して、{cat.name}の ごはんを集めましょう。</p>
              </>
            ) : filter === "todo" ? (
              <p className="empty__title">今日のぶんは ぜんぶ おわりました！</p>
            ) : (
              <p className="empty__title">今日は まだ 終えたタスクがありません</p>
            )}
          </div>
        ) : (
          <TaskList tasks={shown.slice(0, HOME_TASK_LIMIT)} variant="home" />
        )}
        <Link href="/tasks" className="more-link">
          {shown.length > HOME_TASK_LIMIT ? `ほか ${shown.length - HOME_TASK_LIMIT}件を見る` : "すべて見る"}
          <span aria-hidden> ›</span>
        </Link>
      </section>

      <section className="card weekcard" aria-label="今週の記録">
        <div className="card__head">
          <h2 className="card__title">
            <CalendarIcon size={24} className="card__icon" />
            今週の記録
          </h2>
          {streak > 0 && (
            <p className="hint-pill hint-pill--hot">
              <FlameIcon size={16} />
              {streak}日連続達成中！
            </p>
          )}
        </div>
        <ol className="week">
          {week.map((d) => (
            <li key={d.dateKey} className={`week__day${d.done ? " is-done" : ""}${d.isToday ? " is-today" : ""}${d.isFuture ? " is-future" : ""}`} aria-label={`${d.label}曜日：${d.done ? "達成" : d.isFuture ? "これから" : "未達成"}`}>
              <span className="week__label">{d.label}</span>
              <span className="week__mark">{d.done && <CheckIcon size={14} />}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card notecard" aria-label="育成メモ">
        <h2 className="card__title">
          <NoteIcon className="card__icon" />
          育成メモ
        </h2>
        <ul className="notes">
          {notes.map((n) => (
            <li key={n}>
              <PawIcon size={16} />
              {n}
            </li>
          ))}
        </ul>
      </section>

      <TaskDialog open={adding} task={null} onClose={() => setAdding(false)} />
      <LevelUpDialog outcome={celebration} name={cat.name} onClose={() => setCelebration(null)} />
    </div>
  );
}
