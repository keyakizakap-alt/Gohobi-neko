"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CatRoom, phaseOf, type DayPhase } from "@/components/CatRoom";
import { FoodIcon, HeartIcon, PawIcon, PlusIcon } from "@/components/Icons";
import { LevelUpDialog } from "@/components/LevelUpDialog";
import { Meter } from "@/components/Meter";
import { TaskDialog } from "@/components/TaskDialog";
import { TaskList, sortTodo } from "@/components/TaskList";
import { useToast } from "@/components/Toast";
import { FOODS, FOOD_IDS, currentFullness, levelProgress, moodOf, nextStage, stageForLevel, type Mood } from "@/lib/game";
import { toMessage, useStore } from "@/lib/store";
import type { FeedOutcome, FoodId } from "@/lib/types";

const EAT_MS = 1700;
const HOME_TASK_LIMIT = 5;

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
  const [line, setLine] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<FeedOutcome | null>(null);
  const [adding, setAdding] = useState(false);
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
  const todo = useMemo(() => sortTodo(store.tasks), [store.tasks]);
  const foodTotal = FOOD_IDS.reduce((n, f) => n + inventory[f], 0);

  const bubble = line ?? idleLine(mood, todo.length, foodTotal, new Date(store.now).getHours() + todo.length);
  const face = eating ? "eating" : petted ? "happy" : mood;

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
    setHearts((n) => n + 1);
    setPetted(true);
    later(() => setPetted(false), 1200);
    say(PET_LINES[cat.petCount % PET_LINES.length]!, 1800);
    store.pet().catch(() => undefined); // なでた回数は記録できなくても遊びを止めない
  }, [cat.petCount, later, say, store]);

  return (
    <div className="home">
      <section className="home__cat" aria-label="ねこの部屋">
        <header className="cat-head">
          <div>
            <p className="cat-head__stage">{stage.name}</p>
            <h1 className="cat-head__name" data-testid="cat-name">
              {cat.name}
            </h1>
          </div>
          <p className="cat-head__level" aria-label={`レベル${progress.level}`}>
            <small>Lv.</small>
            <span data-testid="cat-level">{progress.level}</span>
          </p>
        </header>

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
        />

        <div className="card status">
          <Meter
            label="せいちょう"
            tone="xp"
            ratio={progress.ratio}
            valueText={`${progress.current} / ${progress.needed} XP`}
            icon={<PawIcon size={16} />}
            testId="xp-value"
          />
          <Meter label="おなか" tone="food" ratio={fullness / 100} valueText={`${fullness}%`} icon={<HeartIcon size={16} />} testId="fullness-value" />
          <p className="status__next">
            {upcoming ? (
              <>
                Lv.{upcoming.minLevel} で <b>「{upcoming.name}」</b> に成長します
              </>
            ) : (
              <>さいごの姿まで育ちました。これからも いっしょに。</>
            )}
          </p>
        </div>

        <div className="card pantry">
          <h2 className="card__title">ごはんをあげる</h2>
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
                  <FoodIcon food={id} size={52} />
                  <span className="food__name">{f.name}</span>
                  <span className="food__xp">+{f.xp} XP</span>
                  <span className="food__count" data-testid={`count-${id}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          {foodTotal === 0 && <p className="pantry__empty">ごはんがありません。やることを終えると もらえます。</p>}
        </div>
      </section>

      <section className="home__tasks" aria-label="やること">
        <div className="section-head">
          <h2 className="section-head__title">
            やること <span className="count-pill">{todo.length}</span>
          </h2>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setAdding(true)}>
            <PlusIcon size={18} />
            追加
          </button>
        </div>

        {todo.length === 0 ? (
          <div className="empty">
            <p className="empty__title">やることは ありません</p>
            <p>タスクを追加して、{cat.name}の ごはんを集めましょう。</p>
            <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
              <PlusIcon size={18} />
              さいしょのタスクを追加
            </button>
          </div>
        ) : (
          <>
            <TaskList tasks={todo.slice(0, HOME_TASK_LIMIT)} compact />
            <Link href="/tasks" className="more-link">
              {todo.length > HOME_TASK_LIMIT ? `ほか ${todo.length - HOME_TASK_LIMIT}件を見る` : "タスクをすべて見る・編集する"}
            </Link>
          </>
        )}
      </section>

      <TaskDialog open={adding} task={null} onClose={() => setAdding(false)} />
      <LevelUpDialog outcome={celebration} name={cat.name} onClose={() => setCelebration(null)} />
    </div>
  );
}
