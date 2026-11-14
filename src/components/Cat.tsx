import type { CSSProperties } from "react";
import type { StageId } from "@/lib/types";

export type CatFace = "normal" | "happy" | "hungry" | "eating" | "yawn" | "groom" | "sleep";

interface Props {
  stage: StageId;
  face?: CatFace;
  /** true のあいだ、まばたき・呼吸などのアニメーションを動かす */
  animated?: boolean;
  /** 図鑑の未解放表示用シルエット */
  silhouette?: boolean;
  className?: string;
  title?: string;
}

/**
 * 写真（AI生成・背景切り抜き済み）は4枚。足りない表情は、写真の組み合わせと動き・色で表す。
 *  - 毛づくろい・眠る：目を閉じた「ごきげん」の写真
 *  - おなかぺこぺこ：「ふつう」の写真を少しくすませる
 */
type Photo = "normal" | "happy" | "eating" | "yawn";
const PHOTO: Record<CatFace, Photo> = {
  normal: "normal",
  hungry: "normal",
  happy: "happy",
  groom: "happy",
  sleep: "happy",
  eating: "eating",
  yawn: "yawn",
};

/**
 * 写真上の位置（画像の幅・高さに対する%）。首輪は首、王冠は耳のあいだに置く。
 * 食べる写真は首が隠れるので首輪を出さない。
 */
const ANCHOR: Record<Photo, { headX: number; headY: number; neckY: number | null }> = {
  normal: { headX: 50.7, headY: 10.6, neckY: 37 },
  happy: { headX: 51.1, headY: 11.1, neckY: 36.6 },
  yawn: { headX: 50.7, headY: 10.9, neckY: 41.2 },
  eating: { headX: 51.4, headY: 59.5, neckY: null },
};

/** 成長段階ごとの大きさ（足元を基準に縮める） */
const SCALE: Record<StageId, number> = { kitten: 0.76, young: 0.86, adult: 0.94, master: 1 };

export const CAT_PHOTOS = ["normal", "happy", "eating", "yawn"].map((p) => `/cat/${p}.webp`);

export function Cat({ stage, face = "normal", animated = true, silhouette = false, className, title }: Props) {
  const photo = PHOTO[face];
  const a = ANCHOR[photo];
  const cls = ["cat", `cat--${face}`, `cat--${stage}`, animated ? "cat--animated" : "", silhouette ? "cat--silhouette" : "", className]
    .filter(Boolean)
    .join(" ");
  const style = { "--cat-scale": SCALE[stage] } as CSSProperties;

  return (
    <span className={cls} style={style} role="img" aria-label={title ?? "ねこ"}>
      <span className="cat__body">
        <span className="cat__shadow" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="cat__photo" src={`/cat/${photo}.webp`} alt="" width={480} height={720} decoding="async" draggable={false} />
        {/* まばたき：目を閉じた写真を一瞬だけ重ねる */}
        {photo === "normal" && animated && !silhouette && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="cat__photo cat__blink" src="/cat/happy.webp" alt="" width={480} height={720} decoding="async" draggable={false} />
        )}
        {!silhouette && <Accessories stage={stage} headX={a.headX} headY={a.headY} neckY={a.neckY} />}
        {face === "sleep" && (
          <span className="cat__zzz" aria-hidden>
            <i>Z</i>
            <i>z</i>
            <i>z</i>
          </span>
        )}
      </span>
    </span>
  );
}

/** 成長段階のしるし：わかねこ＝鈴つき首輪、おとなねこ＝リボン、ねこさま＝宝石の首輪＋王冠 */
function Accessories({ stage, headX, headY, neckY }: { stage: StageId; headX: number; headY: number; neckY: number | null }) {
  if (stage === "kitten") return null;
  return (
    <>
      {neckY !== null && (
        <svg className="cat__collar" viewBox="0 0 200 70" style={{ left: `${headX}%`, top: `${neckY}%` }} aria-hidden>
          <defs>
            <linearGradient id={`band-${stage}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={stage === "young" ? "#e2554b" : stage === "adult" ? "#3d9a8f" : "#8a5bb8"} />
              <stop offset="1" stopColor={stage === "young" ? "#a8322b" : stage === "adult" ? "#25685f" : "#5c3584"} />
            </linearGradient>
            <radialGradient id={`gold-${stage}`} cx=".35" cy=".3" r=".8">
              <stop offset="0" stopColor="#fff3c2" />
              <stop offset=".45" stopColor="#f2bf45" />
              <stop offset="1" stopColor="#a8721c" />
            </radialGradient>
          </defs>
          <path d="M6 8 Q100 44 194 8 L194 22 Q100 60 6 22 Z" fill={`url(#band-${stage})`} />
          {stage === "young" && (
            <g>
              <circle cx="100" cy="46" r="15" fill={`url(#gold-${stage})`} />
              <path d="M88 46h24M100 46v10" stroke="#7a5212" strokeWidth="2.4" strokeLinecap="round" />
            </g>
          )}
          {stage === "adult" && (
            <g>
              <path d="M100 38 L66 22 Q58 40 68 58 Z" fill={`url(#gold-${stage})`} />
              <path d="M100 38 L134 22 Q142 40 132 58 Z" fill={`url(#gold-${stage})`} />
              <circle cx="100" cy="39" r="10" fill={`url(#gold-${stage})`} />
            </g>
          )}
          {stage === "master" && (
            <g>
              <path d="M100 30 l13 14 -13 17 -13-17z" fill="#7fd6cd" stroke="#2f7f77" strokeWidth="2" />
              <path d="M100 30 l6 14 -6 17z" fill="#fff" opacity=".45" />
            </g>
          )}
        </svg>
      )}
      {stage === "master" && (
        <svg className="cat__crown" viewBox="0 0 120 70" style={{ left: `${headX}%`, top: `${headY}%` }} aria-hidden>
          <defs>
            <linearGradient id="crown-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffe48a" />
              <stop offset=".6" stopColor="#f2b734" />
              <stop offset="1" stopColor="#b47b1a" />
            </linearGradient>
          </defs>
          <path d="M14 62 L8 14 L36 36 L60 4 L84 36 L112 14 L106 62 Z" fill="url(#crown-gold)" stroke="#8a5a12" strokeWidth="2.4" strokeLinejoin="round" />
          <rect x="12" y="52" width="96" height="12" rx="4" fill="url(#crown-gold)" stroke="#8a5a12" strokeWidth="2.2" />
          <circle cx="60" cy="40" r="6" fill="#e8564a" stroke="#8a5a12" strokeWidth="1.6" />
          <circle cx="34" cy="58" r="3.4" fill="#7fd6cd" />
          <circle cx="86" cy="58" r="3.4" fill="#7fd6cd" />
          <circle cx="8" cy="13" r="4.5" fill="#fff6d8" stroke="#8a5a12" strokeWidth="1.6" />
          <circle cx="60" cy="4" r="4.5" fill="#fff6d8" stroke="#8a5a12" strokeWidth="1.6" />
          <circle cx="112" cy="13" r="4.5" fill="#fff6d8" stroke="#8a5a12" strokeWidth="1.6" />
        </svg>
      )}
    </>
  );
}
