/** サイドバー下の飾り：クッションで眠るねこ（ごはんの夢を見ている） */
export function SleepingCat({ className }: { className?: string }) {
  const line = "#7d4a2b";
  return (
    <svg className={className} viewBox="0 0 220 190" aria-hidden>
      {/* 葉っぱ */}
      <g fill="#cfe3c4" opacity=".8">
        <path d="M14 190 C 4 150, 10 120, 30 100 C 34 130, 30 160, 22 190Z" />
        <path d="M0 176 C -6 150, 2 132, 16 124 C 18 144, 12 162, 6 178Z" />
      </g>
      {/* ふきだし */}
      <g className="sleep__dream">
        <circle cx="86" cy="76" r="4" fill="#fff" stroke="#f3d2b3" strokeWidth="1.500" />
        <circle cx="96" cy="60" r="6" fill="#fff" stroke="#f3d2b3" strokeWidth="1.500" />
        <ellipse cx="146" cy="38" rx="42" ry="30" fill="#fff" stroke="#f3d2b3" strokeWidth="1.500" />
        <path d="M124 36h44l-5 13a5 5 0 0 1-5 3h-24a5 5 0 0 1-5-3z" fill="#f8b57a" stroke={line} strokeWidth="1.800" strokeLinejoin="round" />
        <ellipse cx="146" cy="36" rx="22" ry="6" fill="#c98a4e" stroke={line} strokeWidth="1.800" />
        <g fill="#8a5a34">
          <circle cx="138" cy="35" r="2" />
          <circle cx="146" cy="33" r="2" />
          <circle cx="154" cy="36" r="2" />
        </g>
      </g>
      {/* クッション */}
      <ellipse cx="124" cy="166" rx="92" ry="20" fill="#f6c9a4" />
      <ellipse cx="124" cy="160" rx="92" ry="20" fill="#fbdcc0" />
      {/* ねこ */}
      <g className="sleep__cat">
        <path d="M60 150 C 56 120, 84 104, 124 106 C 168 108, 196 124, 192 148 C 190 164, 160 168, 122 168 C 88 168, 62 166, 60 150Z" fill="#fffaf2" stroke={line} strokeWidth="2.200" />
        <path d="M150 110 C 176 112, 194 126, 192 146 C 180 140, 166 124, 150 110Z" fill="#f0a25a" />
        <path d="M104 107 C 116 112, 122 124, 118 136 C 108 128, 102 118, 104 107Z" fill="#f0a25a" />
        <path d="M52 128 L52 108 L68 116Z M98 118 L104 100 L112 118Z" fill="#f0a25a" stroke={line} strokeWidth="2.200" strokeLinejoin="round" />
        <ellipse cx="80" cy="140" rx="34" ry="26" fill="#fffaf2" stroke={line} strokeWidth="2.200" />
        <path d="M58 122 C 66 114, 80 112, 92 118 C 84 124, 70 126, 58 122Z" fill="#f0a25a" />
        <path d="M64 142 q6 5 12 0 M86 142 q6 5 12 0" fill="none" stroke={line} strokeWidth="2.200" strokeLinecap="round" />
        <path d="M78 150 h5 l-2.500 3z" fill="#f7a9a0" />
        <ellipse cx="62" cy="152" rx="6" ry="3.500" fill="#f7a9a0" opacity=".5" />
        <ellipse cx="100" cy="152" rx="6" ry="3.500" fill="#f7a9a0" opacity=".5" />
        <path d="M188 150 C 204 152, 206 168, 190 170 C 170 172, 150 170, 140 168" fill="none" stroke={line} strokeWidth="11" strokeLinecap="round" />
        <path d="M188 150 C 204 152, 206 168, 190 170 C 170 172, 150 170, 140 168" fill="none" stroke="#f0a25a" strokeWidth="7" strokeLinecap="round" />
      </g>
    </svg>
  );
}
