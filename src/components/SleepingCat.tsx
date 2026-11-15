/**
 * サイドバー下の飾り：ふかふかのクッションに沈み込んで眠る、ねこ（写真）。
 * 奥のクッション → ねこ → 手前のクッションのふち の順に重ねて、体が沈んでいるように見せる。
 * 頭の上に、ごはんの夢のふきだしと Zzz を出す。
 */
export function SleepingCat({ className }: { className?: string }) {
  const line = "#a2694a";
  return (
    <div className={`sleep ${className ?? ""}`} aria-hidden>
      {/* やわらかい光だまり */}
      <span className="sleep__glow" />

      {/* クッション（奥）：本体と、ねこの体の下の影 */}
      <svg className="sleep__cushion sleep__cushion--back" viewBox="0 0 220 90">
        <defs>
          <radialGradient id="cush-top" cx=".5" cy=".38" r=".62">
            <stop offset="0" stopColor="#fff1e3" />
            <stop offset=".7" stopColor="#fbd9bd" />
            <stop offset="1" stopColor="#f2c09b" />
          </radialGradient>
          <radialGradient id="cush-dent" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#c98a62" stopOpacity=".42" />
            <stop offset="1" stopColor="#c98a62" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="110" cy="62" rx="104" ry="24" fill="#7d4a2b" opacity=".1" />
        <path d="M10 46 C 10 24, 60 16, 110 16 C 160 16, 210 24, 210 46 C 210 66, 160 76, 110 76 C 60 76, 10 66, 10 46 Z" fill="url(#cush-top)" />
        {/* 縫い目 */}
        <path d="M24 46 C 40 30, 180 30, 196 46" fill="none" stroke="#e9b994" strokeWidth="1.4" strokeDasharray="3 4" strokeLinecap="round" />
        {/* ねこが沈むくぼみ */}
        <ellipse cx="112" cy="50" rx="74" ry="15" fill="url(#cush-dent)" />
      </svg>

      {/* ねこ */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="sleep__cat" src="/cat/sleep.webp" alt="" width={480} height={720} decoding="async" draggable={false} />

      {/* クッション（手前のふち）：ねこの足元にかぶせて沈み込みを出す */}
      <svg className="sleep__cushion sleep__cushion--front" viewBox="0 0 220 90">
        <defs>
          <linearGradient id="cush-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbd9bd" />
            <stop offset="1" stopColor="#eeb48c" />
          </linearGradient>
        </defs>
        <path d="M10 46 C 10 66, 60 76, 110 76 C 160 76, 210 66, 210 46 C 210 60, 180 64, 110 64 C 40 64, 10 60, 10 46 Z" fill="url(#cush-rim)" />
        <path d="M10 46 C 10 66, 60 76, 110 76 C 160 76, 210 66, 210 46 C 210 80, 160 88, 110 88 C 60 88, 10 80, 10 46 Z" fill="#e9a87f" />
        <path d="M40 70 q70 10 140 0" fill="none" stroke="#fff3e6" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
      </svg>

      {/* 夢のふきだし（頭の右上から、小さな泡でつなぐ） */}
      <svg className="sleep__dream" viewBox="0 0 120 84">
        <circle cx="10" cy="76" r="3.2" fill="#fff" stroke="#f0cfae" strokeWidth="1.4" />
        <circle cx="21" cy="64" r="5" fill="#fff" stroke="#f0cfae" strokeWidth="1.4" />
        <path d="M34 40 C 30 22, 50 8, 68 14 C 80 2, 108 6, 110 26 C 122 34, 116 58, 98 56 C 90 68, 64 68, 58 58 C 40 64, 26 52, 34 40 Z" fill="#fff" stroke="#f0cfae" strokeWidth="1.4" />
        <path d="M54 34h36l-4 11a5 5 0 0 1-4.6 3H62.6a5 5 0 0 1-4.6-3z" fill="#f8b57a" stroke={line} strokeWidth="1.6" strokeLinejoin="round" />
        <ellipse cx="72" cy="34" rx="18" ry="5" fill="#c98a4e" stroke={line} strokeWidth="1.6" />
        <g fill="#8a5a34">
          <circle cx="66" cy="33" r="1.8" />
          <circle cx="72" cy="31.5" r="1.8" />
          <circle cx="78" cy="34" r="1.8" />
        </g>
        <path d="M86 22 l2 -4 2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 z" fill="#ffd77a" />
      </svg>

      <span className="sleep__zzz">
        <i>z</i>
        <i>z</i>
        <i>Z</i>
      </span>

      {/* 鉢植え */}
      <svg className="sleep__plant" viewBox="0 0 44 96">
        <g fill="#a8cf9c">
          <path d="M22 62 C 8 50, 4 30, 10 12 C 20 26, 24 44, 22 62 Z" />
          <path d="M22 62 C 30 46, 40 38, 42 22 C 30 28, 22 42, 22 62 Z" fill="#8fc184" />
          <path d="M22 62 C 14 54, 2 52, 0 42 C 12 42, 20 50, 22 62 Z" fill="#bcdcb1" />
        </g>
        <path d="M8 62h28l-4 30a4 4 0 0 1-4 4h-12a4 4 0 0 1-4-4z" fill="#f3d2b6" />
        <path d="M6 60h32v6H6z" fill="#e9bfa0" rx="2" />
      </svg>
    </div>
  );
}
