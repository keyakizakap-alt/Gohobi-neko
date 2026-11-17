"use client";

import { useId, type ReactNode } from "react";
import { Cushion, FloorDefs, FloorFill, Frame, Lamp, Plant, Rug, Tower, Toy, WallDefs, WallFill } from "./RoomParts";
import { defaultRoom, type RoomConfig } from "@/lib/room";
import { Cat, type CatFace } from "./Cat";
import { HeartIcon } from "./Icons";
import type { FoodId, StageId } from "@/lib/types";

export type DayPhase = "morning" | "day" | "evening" | "night";

export function phaseOf(date: Date): DayPhase {
  const h = date.getHours();
  if (h >= 5 && h < 10) return "morning";
  if (h >= 10 && h < 16) return "day";
  if (h >= 16 && h < 19) return "evening";
  return "night";
}

const SKY: Record<DayPhase, [string, string]> = {
  morning: ["#ffe6c7", "#cfeaf2"],
  day: ["#b5e2f2", "#eaf8f6"],
  evening: ["#f6a36b", "#fbd9a5"],
  night: ["#2f3f6b", "#5a6c9c"],
};

/** 窓から差し込む光の色 */
const RAY: Record<DayPhase, string> = {
  morning: "#ffe2b8",
  day: "#ffffff",
  evening: "#ffb46b",
  night: "#b9c8ff",
};

interface Props {
  name: string;
  stage: StageId;
  face: CatFace;
  phase: DayPhase;
  bubble: ReactNode;
  eatingFood: FoodId | null;
  /** 値が変わるたびにハートを飛ばす */
  heartBurst: number;
  xpPop: { key: number; amount: number } | null;
  /** 部屋の左上に重ねる表示（レベルカードなど） */
  overlay?: ReactNode;
  /** 部屋の右下に重ねる表示（もようがえボタンなど） */
  corner?: ReactNode;
  /** もようがえの設定 */
  room?: RoomConfig;
  onPet(): void;
}

/** ねこの部屋。背景は1枚のSVG、ねこ・おさら・ふきだしは重ねて配置する */
export function CatRoom({ name, stage, face, phase, bubble, eatingFood, heartBurst, xpPop, overlay, corner, room = defaultRoom(), onPet }: Props) {
  const [skyTop, skyBottom] = SKY[phase];
  const night = phase === "night";
  // SVG の id は1ページ内で重ならないようにする（useId の記号は id に使えないので取り除く）
  const uid = "r" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const f = room.furniture;
  return (
    <div className={`room room--${phase}`} id="cat-room">
      <svg className="room__bg" viewBox="0 0 400 320" preserveAspectRatio="xMidYMax slice" aria-hidden>
        <defs>
          <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={skyTop} />
            <stop offset="1" stopColor={skyBottom} />
          </linearGradient>
          <WallDefs uid={uid} wall={room.wall} />
          <FloorDefs uid={uid} floor={room.floor} />
          <linearGradient id={`${uid}-ray`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={RAY[phase]} stopOpacity=".55" />
            <stop offset="1" stopColor={RAY[phase]} stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${uid}-lampGlow`}>
            <stop offset="0" stopColor="#ffd98a" stopOpacity=".75" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${uid}-pane`}>
            <rect x="64" y="20" width="150" height="150" rx="6" />
          </clipPath>
        </defs>

        <WallFill uid={uid} />
        <FloorFill uid={uid} floor={room.floor} />
        <rect y="226" width="400" height="8" fill="#fffaf2" />
        <rect y="234" width="400" height="2" fill="#e6c39a" opacity=".6" />

        {/* 大きな窓 */}
        <g>
          <rect x="56" y="12" width="166" height="166" rx="10" fill="#fffaf2" stroke="#e8cfae" strokeWidth="2" />
          <rect x="64" y="20" width="150" height="150" rx="6" fill={`url(#${uid}-sky)`} />
          <g clipPath={`url(#${uid}-pane)`}>
            {night ? (
              <>
                <circle cx="190" cy="112" r="24" fill="#fff6c8" opacity=".18" />
                <circle cx="190" cy="112" r="15" fill="#fbe9a8" />
                <circle cx="197" cy="106" r="13" fill={skyTop} />
                <g fill="#fff6d8" className="room__stars">
                  <circle cx="150" cy="104" r="1.600" />
                  <circle cx="170" cy="138" r="1.200" />
                  <circle cx="204" cy="140" r="1.400" />
                  <circle cx="160" cy="124" r="1" />
                  <circle cx="132" cy="120" r="1.200" />
                </g>
              </>
            ) : (
              <>
                {phase === "morning" && <circle cx="180" cy="136" r="26" fill="#ffd9a0" opacity=".45" />}
                {phase === "evening" && <circle cx="186" cy="142" r="34" fill="#ffb066" opacity=".45" />}
                <circle
                  cx={phase === "morning" ? 180 : phase === "evening" ? 186 : 186}
                  cy={phase === "morning" ? 136 : phase === "evening" ? 142 : 112}
                  r={phase === "evening" ? 20 : 16}
                  fill={phase === "evening" ? "#ff9f4a" : phase === "morning" ? "#ffe3a0" : "#fff3bd"}
                />
                <g fill="#fff" opacity={phase === "evening" ? 0.55 : 0.92} className="room__cloud">
                  <ellipse cx="148" cy="108" rx="18" ry="7" />
                  <ellipse cx="158" cy="101" rx="11" ry="7" />
                </g>
              </>
            )}
            <path d="M64 170 Q98 124 136 150 T214 132 V170Z" fill={night ? "#4a6660" : "#a8d3a0"} />
            <path d="M64 170 Q110 146 150 160 T214 152 V170Z" fill={night ? "#3f5a56" : "#8fc38a"} />
          </g>
          <path d="M139 20v150M64 95h150" stroke="#fffaf2" strokeWidth="7" />
          <rect x="48" y="174" width="182" height="11" rx="5.500" fill="#fffaf2" stroke="#e8cfae" strokeWidth="2" />
          <path className="room__ray" d={phase === "evening" ? "M64 170 L214 170 L360 320 L90 320Z" : phase === "morning" ? "M64 170 L214 170 L250 320 L-20 320Z" : "M64 170 L214 170 L300 320 L20 320Z"} fill={`url(#${uid}-ray)`} opacity={night ? 0.22 : phase === "evening" ? 0.75 : 0.5} />
        </g>

        <Frame id={f.frame} />
        <Tower id={f.tower} />
        <Plant id={f.plant} />
        <Lamp id={f.lamp} night={night} uid={uid} />
        <Cushion id={f.cushion} />
        <Rug id={f.rug} uid={uid} />
        <Toy id={f.toy} />
      </svg>

      <div className="room__tint" aria-hidden />
      {overlay && <div className="room__overlay">{overlay}</div>}
      {corner && <div className="room__corner">{corner}</div>}
      <div className="room__bubble" key={typeof bubble === "string" ? bubble : undefined}>
        {bubble}
      </div>

      <button type="button" className="room__cat" onClick={onPet} aria-label={face === "sleep" ? `${name}を起こす` : `${name}をなでる`} data-face={face}>
        <Cat stage={stage} face={face} title={name} />
        <span className="room__hearts" key={heartBurst} aria-hidden>
          {heartBurst > 0 && [0, 1, 2].map((i) => <HeartIcon key={i} size={22} className={`room__heart room__heart--${i}`} />)}
        </span>
        {xpPop && (
          <span className="room__xp" key={xpPop.key} aria-hidden>
            +{xpPop.amount} XP
          </span>
        )}
      </button>

      <div className={`room__bowl${eatingFood ? " room__bowl--full" : ""}`} aria-hidden>
        <svg viewBox="0 0 90 44" className="room__bowl-svg">
          <ellipse cx="45" cy="39" rx="38" ry="4.500" fill="#7d4a2b" opacity=".12" />
          <path d="M8 12h74l-8 23a7 7 0 0 1-6.600 5H22.600a7 7 0 0 1-6.600-5z" fill="#fffaf2" stroke="#e3c8a6" strokeWidth="2" strokeLinejoin="round" />
          <ellipse cx="45" cy="12" rx="37" ry="7" fill="#f6e3cd" stroke="#e3c8a6" strokeWidth="2" />
          <g fill="#f5913f">
            <ellipse cx="45" cy="30" rx="4.500" ry="3.600" />
            <circle cx="38.500" cy="25" r="1.800" />
            <circle cx="43" cy="22.500" r="1.800" />
            <circle cx="47.500" cy="22.500" r="1.800" />
            <circle cx="52" cy="25" r="1.800" />
          </g>
        </svg>
      </div>
    </div>
  );
}
