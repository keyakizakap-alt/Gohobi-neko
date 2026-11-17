/**
 * 部屋の部品（SVG）。壁紙・床・家具を、もようがえの設定に合わせて描き分ける。
 * 座標はすべて部屋の viewBox（0 0 400 320）。壁は y=0〜232、床は y=232〜320。
 */
import type { FloorId, WallId } from "@/lib/room";

/** SVG の id は1ページ内で重ならないよう、呼び出し側から接頭辞をもらう */
type P = { uid: string };

const WALL_BASE: Record<WallId, [string, string]> = {
  "cream-dot": ["#fff3e2", "#fbe2c8"],
  "mint-stripe": ["#eef8f1", "#e2f2e7"],
  "pink-check": ["#fff0f1", "#fde3e6"],
  sky: ["#e6f4fb", "#d2eaf5"],
  "night-star": ["#45507d", "#343f6b"],
  "wood-panel": ["#ecc89c", "#e2b98a"],
};

export function WallDefs({ uid, wall }: P & { wall: WallId }) {
  const [a, b] = WALL_BASE[wall];
  return (
    <>
      <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={a} />
        <stop offset="1" stopColor={b} />
      </linearGradient>
      {wall === "cream-dot" && (
        <pattern id={`${uid}-wallp`} width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="1.8" fill="#f4cfa4" />
          <circle cx="18" cy="18" r="1.8" fill="#f8d9b8" />
        </pattern>
      )}
      {wall === "mint-stripe" && (
        <pattern id={`${uid}-wallp`} width="28" height="28" patternUnits="userSpaceOnUse">
          <rect width="12" height="28" fill="#d3eedc" />
          <rect x="12" width="1.5" height="28" fill="#c2e4cd" />
        </pattern>
      )}
      {wall === "pink-check" && (
        <pattern id={`${uid}-wallp`} width="32" height="32" patternUnits="userSpaceOnUse">
          <rect width="16" height="32" fill="#f9d4d9" opacity=".55" />
          <rect width="32" height="16" fill="#f9d4d9" opacity=".55" />
        </pattern>
      )}
      {wall === "sky" && (
        <pattern id={`${uid}-wallp`} width="120" height="70" patternUnits="userSpaceOnUse">
          <g fill="#fff" opacity=".85">
            <ellipse cx="30" cy="22" rx="16" ry="6" />
            <ellipse cx="40" cy="17" rx="10" ry="6" />
            <ellipse cx="92" cy="52" rx="13" ry="5" />
            <ellipse cx="100" cy="48" rx="8" ry="5" />
          </g>
        </pattern>
      )}
      {wall === "night-star" && (
        <pattern id={`${uid}-wallp`} width="60" height="60" patternUnits="userSpaceOnUse">
          <g fill="#fff3c4">
            <path d="M12 10l1.4 3 3 .4-2.2 2 .6 3-2.8-1.5-2.8 1.5.6-3-2.2-2 3-.4z" />
            <circle cx="44" cy="36" r="1.4" />
            <circle cx="28" cy="50" r="1" />
            <path d="M48 8l.9 2 2 .3-1.5 1.3.4 2-1.8-1-1.8 1 .4-2-1.5-1.3 2-.3z" />
          </g>
        </pattern>
      )}
      {wall === "wood-panel" && (
        <pattern id={`${uid}-wallp`} width="40" height="232" patternUnits="userSpaceOnUse">
          <rect width="1.6" height="232" fill="#c99a68" />
          <path d="M14 20q4 30 0 60M26 120q-4 30 0 60" stroke="#d6a979" strokeWidth="1.2" fill="none" />
        </pattern>
      )}
    </>
  );
}

export function WallFill({ uid, height = 236 }: P & { height?: number }) {
  return (
    <>
      <rect width="400" height={height} fill={`url(#${uid}-wall)`} />
      <rect width="400" height={height} fill={`url(#${uid}-wallp)`} />
    </>
  );
}

const FLOOR_BASE: Record<FloorId, [string, string]> = {
  oak: ["#f3d3ab", "#ecc394"],
  tatami: ["#dcd79a", "#cfc985"],
  tile: ["#f6f2ec", "#ebe5dc"],
  walnut: ["#a8754b", "#94643d"],
  carpet: ["#a5cf9f", "#92c08d"],
};

export function FloorDefs({ uid, floor }: P & { floor: FloorId }) {
  const [a, b] = FLOOR_BASE[floor];
  return (
    <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  );
}

export function FloorFill({ uid, floor }: P & { floor: FloorId }) {
  return (
    <g>
      <rect y="232" width="400" height="88" fill={`url(#${uid}-floor)`} />
      {floor === "oak" && <path d="M0 256h400M0 284h400M70 232v24M190 232v24M310 232v24M130 256v28M250 256v28M40 284v36M200 284v36M340 284v36" stroke="#e0b480" strokeWidth="1.2" opacity=".6" />}
      {floor === "walnut" && <path d="M0 256h400M0 284h400M70 232v24M190 232v24M310 232v24M130 256v28M250 256v28M40 284v36M200 284v36M340 284v36" stroke="#7a5030" strokeWidth="1.3" opacity=".55" />}
      {floor === "tatami" && (
        <g stroke="#7d6a3a" strokeWidth="3" opacity=".55">
          <path d="M0 268h400M140 232v36M300 232v36M80 268v52M240 268v52M380 268v52" />
          <path d="M0 268h400" stroke="#4f6b3a" strokeWidth="5" opacity=".6" />
        </g>
      )}
      {floor === "tile" && <path d="M0 254h400M0 280h400M0 306h400M50 232v88M110 232v88M170 232v88M230 232v88M290 232v88M350 232v88" stroke="#dcd3c6" strokeWidth="1.4" />}
      {floor === "carpet" && (
        <g fill="#86b682" opacity=".7">
          {Array.from({ length: 40 }, (_, i) => (
            <circle key={i} cx={(i * 53) % 400} cy={240 + ((i * 37) % 76)} r="1.3" />
          ))}
        </g>
      )}
    </g>
  );
}

/** かべかざり：窓の右の壁 */
export function Frame({ id }: { id: string }) {
  if (id === "photo")
    return (
      <g>
        <rect x="236" y="40" width="44" height="52" rx="4" fill="#fffaf2" stroke="#c99a68" strokeWidth="3" />
        <rect x="242" y="46" width="32" height="40" rx="2" fill="#dcecf3" />
        <path d="M248 86c0-10 4-16 10-16s10 6 10 16z" fill="#9aa3ad" />
        <circle cx="258" cy="66" r="8" fill="#9aa3ad" />
        <path d="M251 61l2-8 5 5zM265 61l-2-8-5 5z" fill="#9aa3ad" />
        <path d="M258 34l-14 6h28z" fill="none" stroke="#c99a68" strokeWidth="1.5" />
      </g>
    );
  if (id === "clock")
    return (
      <g>
        <circle cx="258" cy="62" r="22" fill="#fffaf2" stroke="#c99a68" strokeWidth="3.5" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <circle key={i} cx={258 + Math.sin(a) * 16} cy={62 - Math.cos(a) * 16} r={i % 3 === 0 ? 1.8 : 1} fill="#a07a52" />;
        })}
        <path d="M258 62V50M258 62l8 4" stroke="#5c4030" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="258" cy="62" r="2" fill="#e8564a" />
      </g>
    );
  return null;
}

/** つりさげ鉢：右上 */
export function Plant({ id }: { id: string }) {
  if (id === "none") return null;
  const flower = id === "flower";
  return (
    <g className="room__plant">
      <path d="M318 0v30M338 0v30" stroke="#d9bf9c" strokeWidth="1.5" />
      <g fill="#8fc38a">
        <ellipse cx="306" cy="52" rx="9" ry="6" transform="rotate(-30 306 52)" />
        <ellipse cx="300" cy="68" rx="8" ry="5.5" transform="rotate(-50 300 68)" />
        <ellipse cx="350" cy="52" rx="9" ry="6" transform="rotate(30 350 52)" />
        <ellipse cx="357" cy="70" rx="8" ry="5.5" transform="rotate(55 357 70)" />
        <ellipse cx="352" cy="88" rx="7" ry="5" transform="rotate(40 352 88)" />
      </g>
      <g fill="#6fae74">
        <ellipse cx="316" cy="28" rx="10" ry="7" transform="rotate(-20 316 28)" />
        <ellipse cx="340" cy="28" rx="10" ry="7" transform="rotate(20 340 28)" />
        <ellipse cx="328" cy="22" rx="9" ry="8" />
      </g>
      {flower && (
        <g>
          {[[312, 22, "#f7a1b5"], [330, 16, "#ffd36b"], [346, 24, "#f7a1b5"], [304, 60, "#c9a2f2"], [356, 62, "#ffd36b"]].map(([x, y, c], i) => (
            <g key={i}>
              {[0, 72, 144, 216, 288].map((r) => (
                <ellipse key={r} cx={Number(x)} cy={Number(y) - 4} rx="2.6" ry="4" fill={String(c)} transform={`rotate(${r} ${x} ${y})`} />
              ))}
              <circle cx={Number(x)} cy={Number(y)} r="2" fill="#fff4c4" />
            </g>
          ))}
        </g>
      )}
      <path d="M312 30h32l-4 20h-24z" fill={flower ? "#f7d6c0" : "#fffaf2"} stroke="#e8cfae" strokeWidth="1.8" strokeLinejoin="round" />
    </g>
  );
}

/** キャットタワー：右 */
export function Tower({ id }: { id: string }) {
  if (id === "none") return null;
  return (
    <g stroke="#d3b48c" strokeWidth="1.8" strokeLinejoin="round">
      {id === "tall" && (
        <>
          <rect x="334" y="58" width="14" height="46" fill="#e3c9a4" />
          <path d="M334 70h14M334 82h14M334 94h14" strokeWidth="1" opacity=".7" />
          <rect x="312" y="50" width="62" height="12" rx="6" fill="#f6e7d0" />
          <circle cx="322" cy="68" r="5" fill="#f5913f" stroke="none" />
          <path d="M322 62v1" stroke="#d3b48c" />
        </>
      )}
      <rect x="334" y="112" width="14" height="60" fill="#e3c9a4" />
      <path d="M334 124h14M334 136h14M334 148h14M334 160h14" strokeWidth="1" opacity=".7" />
      <rect x="306" y="102" width="74" height="13" rx="6.5" fill="#f6e7d0" />
      <rect x="302" y="170" width="78" height="62" rx="10" fill="#ecd7b8" />
      <path d="M322 232v-24a18 18 0 0 1 36 0v24z" fill="#b48f68" stroke="none" />
      <rect x="290" y="230" width="100" height="11" rx="5.5" fill="#f6e7d0" />
    </g>
  );
}

/** あかり：タワーの左。夜は点灯する */
export function Lamp({ id, night, uid }: { id: string; night: boolean; uid: string }) {
  if (id === "none") return null;
  if (id === "andon")
    return (
      <g className={`room__lamp${night ? " is-on" : ""}`}>
        {night && <circle cx="262" cy="200" r="64" fill={`url(#${uid}-lampGlow)`} />}
        <rect x="244" y="184" width="36" height="44" rx="3" fill={night ? "#ffe9b0" : "#fff6e2"} stroke="#8a5a34" strokeWidth="2" />
        <path d="M244 198h36M244 213h36M262 184v44" stroke="#8a5a34" strokeWidth="1.2" opacity=".7" />
        <rect x="240" y="180" width="44" height="6" rx="2" fill="#8a5a34" />
        <path d="M244 228v6M280 228v6" stroke="#8a5a34" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    );
  return (
    <g className={`room__lamp${night ? " is-on" : ""}`}>
      {night && <circle cx="262" cy="150" r="70" fill={`url(#${uid}-lampGlow)`} />}
      <path d="M262 168v62" stroke="#cdb08c" strokeWidth="3" />
      <ellipse cx="262" cy="231" rx="16" ry="4" fill="#cdb08c" />
      <path d="M246 168h32l-7-26h-18z" fill={night ? "#ffe6a6" : "#fff3dc"} stroke="#e1c7a2" strokeWidth="1.8" strokeLinejoin="round" />
    </g>
  );
}

/** クッション：左 */
export function Cushion({ id }: { id: string }) {
  if (id === "none") return null;
  if (id === "box")
    return (
      <g stroke="#a8743c" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M2 214h64v40H2z" fill="#d9a668" />
        <path d="M2 214l-8 -14h60l12 14zM66 214l10 -12" fill="#e7bb80" />
        <path d="M18 230h32" strokeWidth="2.4" opacity=".5" />
      </g>
    );
  const [top, side, line] = id === "blue" ? ["#d6e6f7", "#bcd2ea", "#bcd2ea"] : ["#f6d5d3", "#e9bfc0", "#e9bfc0"];
  return (
    <g>
      <ellipse cx="34" cy="246" rx="52" ry="15" fill={side} />
      <ellipse cx="34" cy="239" rx="52" ry="15" fill={top} />
      <path d="M10 236q24 8 48 0" fill="none" stroke={line} strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

/** ラグ：中央の床 */
export function Rug({ id, uid }: { id: string; uid: string }) {
  if (id === "none") return null;
  if (id === "stripe")
    return (
      <g>
        <clipPath id={`${uid}-rugclip`}>
          <ellipse cx="200" cy="288" rx="150" ry="25" />
        </clipPath>
        <g clipPath={`url(#${uid}-rugclip)`}>
          <rect x="50" y="263" width="300" height="50" fill="#fff7ec" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x="50" y={265 + i * 10} width="300" height="5" fill={i % 2 ? "#f9c9a8" : "#a9d4e6"} />
          ))}
        </g>
        <ellipse cx="200" cy="288" rx="150" ry="25" fill="none" stroke="#efd2b6" strokeWidth="2" />
      </g>
    );
  if (id === "heart")
    return (
      <g>
        <ellipse cx="200" cy="288" rx="150" ry="25" fill="#fde4e8" stroke="#f3c2cc" strokeWidth="2" />
        <path d="M200 304c-34-12-52-20-52-30 0-8 10-12 20-9 12 3 24 9 32 15 8-6 20-12 32-15 10-3 20 1 20 9 0 10-18 18-52 30z" fill="#f7b5c3" />
        <ellipse cx="200" cy="288" rx="132" ry="19" fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="2 8" strokeLinecap="round" opacity=".9" />
      </g>
    );
  return (
    <g>
      <ellipse cx="200" cy="288" rx="150" ry="25" fill="#fffaf2" stroke="#f0dcc4" strokeWidth="2" />
      <ellipse cx="200" cy="288" rx="130" ry="18" fill="none" stroke="#f6e3cd" strokeWidth="3" strokeDasharray="1 8" strokeLinecap="round" />
    </g>
  );
}

/** おもちゃ：ラグの右 */
export function Toy({ id }: { id: string }) {
  if (id === "none") return null;
  return (
    <g>
      <ellipse cx="318" cy="299" rx="13" ry="3" fill="#7d4a2b" opacity=".12" />
      {id === "ball" && (
        <>
          <circle cx="318" cy="287" r="12" fill="#f5913f" />
          <path d="M308 281q10 6 20 0M307 290q11 6 22 0" fill="none" stroke="#fff3e2" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {id === "fish" && (
        <>
          <path d="M330 290l10-8v16z" fill="#6fb3cf" stroke="#3f7f99" strokeWidth="1.5" strokeLinejoin="round" />
          <ellipse cx="316" cy="290" rx="16" ry="9" fill="#8ccbe0" stroke="#3f7f99" strokeWidth="1.5" />
          <circle cx="308" cy="288" r="2" fill="#2b2118" />
          <path d="M318 284v12M323 285v10" stroke="#3f7f99" strokeWidth="1.2" opacity=".5" />
        </>
      )}
      {id === "mouse" && (
        <>
          <path d="M330 292q14 2 12 -10" fill="none" stroke="#c9a2a0" strokeWidth="1.8" strokeLinecap="round" />
          <ellipse cx="318" cy="290" rx="13" ry="8" fill="#b8b8c2" stroke="#8a8a96" strokeWidth="1.5" />
          <circle cx="308" cy="282" r="5" fill="#d0d0d8" stroke="#8a8a96" strokeWidth="1.5" />
          <circle cx="306" cy="289" r="1.6" fill="#2b2118" />
          <circle cx="303" cy="291" r="1.4" fill="#f08d86" />
        </>
      )}
    </g>
  );
}
