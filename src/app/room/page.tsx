"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { CatRoom, phaseOf, type DayPhase } from "@/components/CatRoom";
import { LockIcon } from "@/components/Icons";
import { Cushion, FloorDefs, FloorFill, Frame, Lamp, Plant, Rug, Tower, Toy, WallDefs, WallFill } from "@/components/RoomParts";
import { useToast } from "@/components/Toast";
import { levelFromXp, stageForLevel } from "@/lib/game";
import { FLOORS, FURNITURE, WALLS, defaultRoom, isUnlocked, nextUnlock, type FurnitureSlot, type RoomConfig } from "@/lib/room";
import { toMessage, useStore } from "@/lib/store";

type Tab = "wall" | "floor" | "furniture";

/** 家具の見本を切り出す範囲（部屋の viewBox 上の位置） */
const SLOT_VIEW: Record<FurnitureSlot, string> = {
  tower: "282 40 112 206",
  plant: "286 0 84 100",
  lamp: "226 130 72 108",
  cushion: "-22 196 116 66",
  rug: "40 256 320 64",
  toy: "294 268 52 36",
  frame: "222 26 72 72",
};

function Thumb({ viewBox, children, label }: { viewBox: string; children: ReactNode; label: string }) {
  return (
    <svg className="deco__thumb" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label={label}>
      {children}
    </svg>
  );
}

function Option({
  selected,
  locked,
  minLevel,
  name,
  onPick,
  children,
}: {
  selected: boolean;
  locked: boolean;
  minLevel: number;
  name: string;
  onPick(): void;
  children: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        className={`deco__opt${selected ? " is-on" : ""}${locked ? " is-locked" : ""}`}
        aria-pressed={selected}
        aria-label={locked ? `${name}（Lv.${minLevel}で解放）` : name}
        onClick={onPick}
      >
        <span className="deco__pic">{children}</span>
        <span className="deco__name">{name}</span>
        {locked && (
          <span className="deco__lock">
            <LockIcon size={13} />
            Lv.{minLevel}
          </span>
        )}
      </button>
    </li>
  );
}

export default function RoomPage() {
  const store = useStore();
  const toast = useToast();
  const game = store.game!;
  const level = levelFromXp(game.cat.xp);
  const stage = stageForLevel(level);
  const room = game.room;
  const [tab, setTab] = useState<Tab>("wall");
  const [phase, setPhase] = useState<DayPhase>("day");
  const [hearts, setHearts] = useState(0);
  useEffect(() => setPhase(phaseOf(new Date(store.now))), [store.now]);
  const upcoming = nextUnlock(level);

  async function save(next: RoomConfig) {
    try {
      await store.setRoom(next);
    } catch (e) {
      toast.show(toMessage(e), "error");
    }
  }
  const locked = (minLevel: number) => {
    toast.show(`Lv.${minLevel}になると選べるようになります`);
  };

  return (
    <div className="page deco">
      <header className="page__head">
        <h1 className="page__title">もようがえ</h1>
        <Link href="/" className="btn btn--ghost btn--sm">
          ホームに戻る
        </Link>
      </header>

      <div className="deco__layout">
        <div className="deco__preview">
          <CatRoom
            name={game.cat.name}
            stage={stage.id}
            face={hearts % 2 ? "happy" : "normal"}
            phase={phase}
            bubble="どうかにゃ？"
            eatingFood={null}
            heartBurst={hearts}
            xpPop={null}
            room={room}
            onPet={() => setHearts((n) => n + 1)}
          />
          {upcoming && (
            <p className="deco__next">
              つぎは <b>Lv.{upcoming.level}</b> で {upcoming.names.join("・")} が増えます
            </p>
          )}
        </div>

        <section className="card deco__panel">
          <div className="filters" role="tablist" aria-label="もようがえする場所">
            {(
              [
                ["wall", "壁紙"],
                ["floor", "床"],
                ["furniture", "家具"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={`filters__tab${tab === id ? " is-active" : ""}`} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>

          {tab === "wall" && (
            <ul className="deco__grid">
              {WALLS.map((w) => {
                const lock = !isUnlocked(w, level);
                return (
                  <Option key={w.id} name={w.name} selected={room.wall === w.id} locked={lock} minLevel={w.minLevel} onPick={() => (lock ? locked(w.minLevel) : save({ ...room, wall: w.id }))}>
                    <Thumb viewBox="0 0 120 80" label={w.name}>
                      <defs>
                        <WallDefs uid={`tw-${w.id}`} wall={w.id} />
                      </defs>
                      <WallFill uid={`tw-${w.id}`} height={80} />
                    </Thumb>
                  </Option>
                );
              })}
            </ul>
          )}

          {tab === "floor" && (
            <ul className="deco__grid">
              {FLOORS.map((f) => {
                const lock = !isUnlocked(f, level);
                return (
                  <Option key={f.id} name={f.name} selected={room.floor === f.id} locked={lock} minLevel={f.minLevel} onPick={() => (lock ? locked(f.minLevel) : save({ ...room, floor: f.id }))}>
                    <Thumb viewBox="0 232 120 88" label={f.name}>
                      <defs>
                        <FloorDefs uid={`tf-${f.id}`} floor={f.id} />
                      </defs>
                      <FloorFill uid={`tf-${f.id}`} floor={f.id} />
                    </Thumb>
                  </Option>
                );
              })}
            </ul>
          )}

          {tab === "furniture" && (
            <div className="deco__slots">
              {FURNITURE.map((def) => (
                <div key={def.slot} className="deco__slot">
                  <h3 className="deco__slot-name">{def.name}</h3>
                  <ul className="deco__grid deco__grid--small">
                    <Option name="なし" selected={room.furniture[def.slot] === "none"} locked={false} minLevel={1} onPick={() => save({ ...room, furniture: { ...room.furniture, [def.slot]: "none" } })}>
                      <span className="deco__none" aria-hidden>
                        しまう
                      </span>
                    </Option>
                    {def.items.map((item) => {
                      const lock = !isUnlocked(item, level);
                      const uid = `ti-${def.slot}-${item.id}`;
                      return (
                        <Option
                          key={item.id}
                          name={item.name}
                          selected={room.furniture[def.slot] === item.id}
                          locked={lock}
                          minLevel={item.minLevel}
                          onPick={() => (lock ? locked(item.minLevel) : save({ ...room, furniture: { ...room.furniture, [def.slot]: item.id } }))}
                        >
                          <Thumb viewBox={SLOT_VIEW[def.slot]} label={item.name}>
                            <defs>
                              <radialGradient id={`${uid}-lampGlow`}>
                                <stop offset="0" stopColor="#ffd98a" stopOpacity=".75" />
                                <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
                              </radialGradient>
                            </defs>
                            {def.slot === "tower" && <Tower id={item.id} />}
                            {def.slot === "plant" && <Plant id={item.id} />}
                            {def.slot === "lamp" && <Lamp id={item.id} night={false} uid={uid} />}
                            {def.slot === "cushion" && <Cushion id={item.id} />}
                            {def.slot === "rug" && <Rug id={item.id} uid={uid} />}
                            {def.slot === "toy" && <Toy id={item.id} />}
                            {def.slot === "frame" && <Frame id={item.id} />}
                          </Thumb>
                        </Option>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <div className="deco__foot">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => save(defaultRoom())}>
              はじめの部屋にもどす
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
