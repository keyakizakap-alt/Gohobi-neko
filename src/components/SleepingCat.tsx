/**
 * サイドバー下の飾り：クッションの上でうとうとする、ねこ（写真）。ごはんの夢を見ている。
 * 丸まって眠る写真を使い、ゆっくり呼吸させて Zzz を出す。
 */
export function SleepingCat({ className }: { className?: string }) {
  const line = "#7d4a2b";
  return (
    <div className={`sleep ${className ?? ""}`} aria-hidden>
      {/* ごはんの夢のふきだし */}
      <svg className="sleep__dream" viewBox="0 0 120 80">
        <circle cx="16" cy="70" r="4" fill="#fff" stroke="#f3d2b3" strokeWidth="1.5" />
        <circle cx="28" cy="58" r="6" fill="#fff" stroke="#f3d2b3" strokeWidth="1.5" />
        <ellipse cx="72" cy="32" rx="42" ry="28" fill="#fff" stroke="#f3d2b3" strokeWidth="1.5" />
        <path d="M50 30h44l-5 13a5 5 0 0 1-5 3H60a5 5 0 0 1-5-3z" fill="#f8b57a" stroke={line} strokeWidth="1.8" strokeLinejoin="round" />
        <ellipse cx="72" cy="30" rx="22" ry="6" fill="#c98a4e" stroke={line} strokeWidth="1.8" />
        <g fill="#8a5a34">
          <circle cx="64" cy="29" r="2" />
          <circle cx="72" cy="27" r="2" />
          <circle cx="80" cy="30" r="2" />
        </g>
      </svg>

      {/* クッション（奥） */}
      <svg className="sleep__cushion" viewBox="0 0 200 60" preserveAspectRatio="none">
        <ellipse cx="100" cy="38" rx="96" ry="20" fill="#f3c3a0" />
        <ellipse cx="100" cy="30" rx="96" ry="20" fill="#fbdcc0" />
        <path d="M30 28q70 14 140 0" fill="none" stroke="#f3c3a0" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* ねこ */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="sleep__cat" src="/cat/sleep.webp" alt="" width={480} height={720} decoding="async" draggable={false} />

      <span className="sleep__zzz">
        <i>Z</i>
        <i>z</i>
        <i>z</i>
      </span>

      {/* 葉っぱ */}
      <svg className="sleep__leaf" viewBox="0 0 40 90">
        <path d="M14 90 C 4 60, 8 30, 28 8 C 34 40, 30 66, 22 90Z" fill="#cfe3c4" />
        <path d="M4 90 C -2 70, 2 54, 14 46 C 16 64, 12 78, 8 90Z" fill="#dcebd2" />
      </svg>
    </div>
  );
}
