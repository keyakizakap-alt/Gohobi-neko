"use client";

import type { ReactNode } from "react";
import { Cat, type CatFace } from "./Cat";
import { FoodIcon, HeartIcon } from "./Icons";
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
  onPet(): void;
}

/** ねこの部屋。背景は1枚のSVG、ねこ・おさら・ふきだしは重ねて配置する */
export function CatRoom({ name, stage, face, phase, bubble, eatingFood, heartBurst, xpPop, overlay, onPet }: Props) {
  const [skyTop, skyBottom] = SKY[phase];
  const night = phase === "night";
  return (
    <div className={`room room--${phase}`} id="cat-room">
      <svg className="room__bg" viewBox="0 0 400 320" preserveAspectRatio="xMidYMax slice" aria-hidden>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={skyTop} />
            <stop offset="1" stopColor={skyBottom} />
          </linearGradient>
          <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={night ? "#efdcc6" : "#fff3e2"} />
            <stop offset="1" stopColor={night ? "#e2c9ad" : "#fbe2c8"} />
          </linearGradient>
          <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3d3ab" />
            <stop offset="1" stopColor="#ecc394" />
          </linearGradient>
          <linearGradient id="ray" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".5" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="pane">
            <rect x="64" y="20" width="150" height="150" rx="6" />
          </clipPath>
        </defs>

        <rect width="400" height="236" fill="url(#wall)" />
        <rect y="232" width="400" height="88" fill="url(#floor)" />
        <path d="M0 256h400M0 284h400M70 232v24M190 232v24M310 232v24M130 256v28M250 256v28M40 284v36M200 284v36M340 284v36" stroke="#e0b480" strokeWidth="1.200" opacity=".6" />
        <rect y="226" width="400" height="8" fill="#fffaf2" />
        <rect y="234" width="400" height="2" fill="#e6c39a" opacity=".6" />

        {/* 大きな窓 */}
        <g>
          <rect x="56" y="12" width="166" height="166" rx="10" fill="#fffaf2" stroke="#e8cfae" strokeWidth="2" />
          <rect x="64" y="20" width="150" height="150" rx="6" fill="url(#sky)" />
          <g clipPath="url(#pane)">
            {night ? (
              <>
                <circle cx="176" cy="58" r="15" fill="#fbe9a8" />
                <circle cx="183" cy="52" r="13" fill={skyTop} />
                <g fill="#fff6d8">
                  <circle cx="90" cy="46" r="1.600" />
                  <circle cx="122" cy="78" r="1.200" />
                  <circle cx="146" cy="40" r="1.400" />
                  <circle cx="196" cy="104" r="1.300" />
                  <circle cx="84" cy="106" r="1.200" />
                </g>
              </>
            ) : (
              <>
                <circle cx={phase === "evening" ? 184 : 172} cy={phase === "day" ? 54 : 96} r="17" fill={phase === "evening" ? "#ffd27a" : "#fff3bd"} />
                <g fill="#fff" opacity=".92" className="room__cloud">
                  <ellipse cx="98" cy="66" rx="20" ry="8" />
                  <ellipse cx="110" cy="58" rx="12" ry="8" />
                </g>
              </>
            )}
            <path d="M64 170 Q98 124 136 150 T214 132 V170Z" fill={night ? "#4a6660" : "#a8d3a0"} />
            <path d="M64 170 Q110 146 150 160 T214 152 V170Z" fill={night ? "#3f5a56" : "#8fc38a"} />
          </g>
          <path d="M139 20v150M64 95h150" stroke="#fffaf2" strokeWidth="7" />
          <rect x="48" y="174" width="182" height="11" rx="5.500" fill="#fffaf2" stroke="#e8cfae" strokeWidth="2" />
          {!night && <path d="M64 170 L214 170 L300 320 L20 320Z" fill="url(#ray)" opacity=".5" />}
        </g>

        {/* つりさげた植物 */}
        <g className="room__plant">
          <path d="M318 0v30M338 0v30" stroke="#d9bf9c" strokeWidth="1.500" />
          <g fill="#8fc38a">
            <ellipse cx="306" cy="52" rx="9" ry="6" transform="rotate(-30 306 52)" />
            <ellipse cx="300" cy="68" rx="8" ry="5.500" transform="rotate(-50 300 68)" />
            <ellipse cx="350" cy="52" rx="9" ry="6" transform="rotate(30 350 52)" />
            <ellipse cx="357" cy="70" rx="8" ry="5.500" transform="rotate(55 357 70)" />
            <ellipse cx="352" cy="88" rx="7" ry="5" transform="rotate(40 352 88)" />
          </g>
          <g fill="#6fae74">
            <ellipse cx="316" cy="28" rx="10" ry="7" transform="rotate(-20 316 28)" />
            <ellipse cx="340" cy="28" rx="10" ry="7" transform="rotate(20 340 28)" />
            <ellipse cx="328" cy="22" rx="9" ry="8" />
          </g>
          <path d="M312 30h32l-4 20h-24z" fill="#fffaf2" stroke="#e8cfae" strokeWidth="1.800" strokeLinejoin="round" />
        </g>

        {/* キャットタワー */}
        <g stroke="#d3b48c" strokeWidth="1.800" strokeLinejoin="round">
          <rect x="334" y="112" width="14" height="60" fill="#e3c9a4" />
          <path d="M334 124h14M334 136h14M334 148h14M334 160h14" strokeWidth="1" opacity=".7" />
          <rect x="306" y="102" width="74" height="13" rx="6.500" fill="#f6e7d0" />
          <rect x="302" y="170" width="78" height="62" rx="10" fill="#ecd7b8" />
          <path d="M322 232v-24a18 18 0 0 1 36 0v24z" fill="#b48f68" stroke="none" />
          <rect x="290" y="230" width="100" height="11" rx="5.500" fill="#f6e7d0" />
        </g>

        {/* クッション */}
        <g>
          <ellipse cx="34" cy="246" rx="52" ry="15" fill="#e9bfc0" />
          <ellipse cx="34" cy="239" rx="52" ry="15" fill="#f6d5d3" />
          <path d="M10 236q24 8 48 0" fill="none" stroke="#e9bfc0" strokeWidth="1.500" strokeLinecap="round" />
        </g>

        {/* ラグ と ボール */}
        <ellipse cx="200" cy="288" rx="150" ry="25" fill="#fffaf2" stroke="#f0dcc4" strokeWidth="2" />
        <ellipse cx="200" cy="288" rx="130" ry="18" fill="none" stroke="#f6e3cd" strokeWidth="3" strokeDasharray="1 8" strokeLinecap="round" />
        <g>
          <ellipse cx="318" cy="299" rx="12" ry="3" fill="#7d4a2b" opacity=".12" />
          <circle cx="318" cy="287" r="12" fill="#f5913f" />
          <path d="M308 281q10 6 20 0M307 290q11 6 22 0" fill="none" stroke="#fff3e2" strokeWidth="2.400" strokeLinecap="round" />
        </g>
      </svg>

      {overlay && <div className="room__overlay">{overlay}</div>}
      <div className="room__bubble" key={typeof bubble === "string" ? bubble : undefined}>
        {bubble}
      </div>

      <button type="button" className="room__cat" onClick={onPet} aria-label={`${name}をなでる`}>
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
        {eatingFood && <FoodIcon food={eatingFood} size={46} className="room__food" />}
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
