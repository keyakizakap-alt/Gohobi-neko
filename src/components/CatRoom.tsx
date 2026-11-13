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
  morning: ["#ffe2bf", "#bfe3ee"],
  day: ["#a9dcee", "#e4f5f4"],
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
  onPet(): void;
}

/** ねこの部屋。背景は1枚のSVG、ねこ・おさら・ふきだしは重ねて配置する */
export function CatRoom({ name, stage, face, phase, bubble, eatingFood, heartBurst, xpPop, onPet }: Props) {
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
          <pattern id="wall" width="28" height="28" patternUnits="userSpaceOnUse">
            <rect width="28" height="28" fill={night ? "#e9d6b8" : "#f8e6c6"} />
            <circle cx="7" cy="7" r="1.600" fill="#e8744f" opacity=".28" />
            <circle cx="21" cy="21" r="1.600" fill="#6f9e77" opacity=".3" />
          </pattern>
          <pattern id="floor" width="80" height="24" patternUnits="userSpaceOnUse">
            <rect width="80" height="24" fill="#dba76a" />
            <path d="M0 0h80M0 12h80M22 0v12M62 12v12" stroke="#b9824a" strokeWidth="1.400" opacity=".55" />
          </pattern>
          <clipPath id="pane">
            <rect x="34" y="34" width="112" height="96" rx="8" />
          </clipPath>
        </defs>

        <rect width="400" height="232" fill="url(#wall)" />
        <rect y="226" width="400" height="94" fill="url(#floor)" />
        <rect y="222" width="400" height="9" fill="#fff6e4" stroke="#4a3428" strokeWidth="2" />

        {/* 窓 */}
        <g>
          <rect x="26" y="26" width="128" height="112" rx="12" fill="#fff6e4" stroke="#4a3428" strokeWidth="2.500" />
          <rect x="34" y="34" width="112" height="96" rx="8" fill="url(#sky)" />
          <g clipPath="url(#pane)">
            {night ? (
              <>
                <circle cx="112" cy="62" r="13" fill="#fbe9a8" />
                <circle cx="118" cy="57" r="11" fill={skyTop} />
                <g fill="#fff6d8">
                  <circle cx="56" cy="52" r="1.600" />
                  <circle cx="78" cy="76" r="1.200" />
                  <circle cx="94" cy="46" r="1.400" />
                  <circle cx="132" cy="92" r="1.300" />
                  <circle cx="50" cy="96" r="1.200" />
                </g>
              </>
            ) : (
              <>
                <circle cx={phase === "evening" ? 118 : 110} cy={phase === "day" ? 58 : 84} r="14" fill={phase === "evening" ? "#ffd27a" : "#fff0b0"} />
                <g fill="#fff" opacity=".9" className="room__cloud">
                  <ellipse cx="62" cy="66" rx="16" ry="7" />
                  <ellipse cx="72" cy="60" rx="10" ry="7" />
                </g>
              </>
            )}
            <path d="M34 130 Q60 100 86 118 T146 104 V130Z" fill={night ? "#3f5a56" : "#8fbf8a"} />
          </g>
          <path d="M90 34v96M34 82h112" stroke="#fff6e4" strokeWidth="6" />
          <path d="M90 34v96M34 82h112" stroke="#4a3428" strokeWidth="1.200" opacity=".25" />
          <rect x="20" y="134" width="140" height="10" rx="5" fill="#fff6e4" stroke="#4a3428" strokeWidth="2.500" />
        </g>

        {/* たな と 写真 */}
        <g>
          <rect x="252" y="96" width="120" height="8" rx="4" fill="#c98a4e" stroke="#4a3428" strokeWidth="2" />
          <rect x="266" y="52" width="38" height="44" rx="5" fill="#fff6e4" stroke="#4a3428" strokeWidth="2" />
          <path d="M276 82l3-10 6 6 6-10 4 14z" fill="#e8744f" />
          <circle cx="279" cy="64" r="3" fill="#f2b544" />
          <g>
            <rect x="322" y="70" width="12" height="26" rx="2" fill="#6f9e77" stroke="#4a3428" strokeWidth="1.800" />
            <rect x="334" y="64" width="11" height="32" rx="2" fill="#e8744f" stroke="#4a3428" strokeWidth="1.800" />
            <rect x="345" y="74" width="13" height="22" rx="2" fill="#f2b544" stroke="#4a3428" strokeWidth="1.800" />
          </g>
        </g>

        {/* 観葉植物 */}
        <g>
          <g stroke="#3f6b4a" strokeWidth="2" fill="#7fb37f" className="room__plant">
            <path d="M352 232 C 340 200, 330 186, 318 176 C 334 176, 350 196, 354 232Z" />
            <path d="M354 232 C 352 196, 356 172, 366 156 C 374 176, 368 206, 358 232Z" />
            <path d="M358 232 C 366 204, 378 192, 392 190 C 386 206, 374 222, 360 234Z" />
          </g>
          <path d="M336 232h44l-5 36h-34z" fill="#e8744f" stroke="#4a3428" strokeWidth="2.200" strokeLinejoin="round" />
          <path d="M333 230h50v8h-50z" fill="#f08a67" stroke="#4a3428" strokeWidth="2.200" strokeLinejoin="round" />
        </g>

        {/* ラグ */}
        <ellipse cx="200" cy="286" rx="150" ry="26" fill="#f4c9a8" stroke="#4a3428" strokeWidth="2.200" />
        <ellipse cx="200" cy="286" rx="128" ry="19" fill="none" stroke="#fff6e4" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
      </svg>

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
          <ellipse cx="45" cy="38" rx="40" ry="5" fill="#4a3428" opacity=".14" />
          <path d="M8 12h74l-9 24a6 6 0 0 1-6 4H23a6 6 0 0 1-6-4z" fill="#7fb7c9" stroke="#4a3428" strokeWidth="2.400" strokeLinejoin="round" />
          <ellipse cx="45" cy="12" rx="37" ry="7" fill="#b9dde8" stroke="#4a3428" strokeWidth="2.400" />
          <path d="M38 26c2-3 5-3 7 0 2-3 5-3 7 0 0 4-7 7-7 7s-7-3-7-7z" fill="#fff6e4" opacity=".9" />
        </svg>
      </div>
    </div>
  );
}
