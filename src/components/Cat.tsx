import type { StageId } from "@/lib/types";

export type CatFace = "normal" | "happy" | "hungry" | "eating";

interface Props {
  stage: StageId;
  face?: CatFace;
  /** true のあいだ、まばたき・しっぽ等のアニメーションを動かす */
  animated?: boolean;
  /** 図鑑の未解放表示用シルエット */
  silhouette?: boolean;
  className?: string;
  title?: string;
}

/** 段階ごとの体つき。body=胴体の倍率、all=全体の倍率 */
const SHAPE: Record<StageId, { body: number; all: number }> = {
  kitten: { body: 0.7, all: 0.74 },
  young: { body: 0.86, all: 0.86 },
  adult: { body: 1, all: 0.95 },
  master: { body: 1.04, all: 1 },
};

const C = {
  fur: "#f0a25a",
  furDark: "#d77f38",
  cream: "#fff3df",
  pink: "#f7a9a0",
  ink: "#4a3428",
};

/**
 * ねこのキャラクター（茶トラ）。SVG を直接描画し、CSS クラスで各パーツを動かす。
 * 成長段階で体格とアクセサリー（鈴・リボン・王冠）が変わる。
 */
export function Cat({ stage, face = "normal", animated = true, silhouette = false, className, title }: Props) {
  const { body, all } = SHAPE[stage];
  // 胴体を縮めたぶん、頭を下げて首がつながるようにする
  const headDy = Math.round(96 * (1 - body));
  const cls = ["cat", `cat--${face}`, animated ? "cat--animated" : "", silhouette ? "cat--silhouette" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <svg className={cls} viewBox="0 0 240 250" role="img" aria-label={title ?? "ねこ"}>
      <g transform={`translate(120 240) scale(${all}) translate(-120 -240)`}>
        <ellipse className="cat__shadow" cx="120" cy="238" rx={64 * body + 8} ry="9" fill={C.ink} opacity=".14" />

        {/* 胴体 */}
        <g transform={`translate(120 234) scale(${body}) translate(-120 -234)`}>
          <g className="cat__tail">
            <path d="M160 206 C 214 214, 226 160, 198 136" fill="none" stroke={C.fur} strokeWidth="18" strokeLinecap="round" />
            <path d="M213 163 C 214 150, 208 142, 198 136" fill="none" stroke={C.furDark} strokeWidth="18" strokeLinecap="round" />
          </g>
          <g className="cat__torso">
            <path d="M120 122 C 78 122, 62 168, 64 198 C 66 226, 88 236, 120 236 C 152 236, 174 226, 176 198 C 178 168, 162 122, 120 122 Z" fill={C.fur} />
            <path d="M120 150 C 100 150, 92 178, 93 200 C 94 222, 104 232, 120 232 C 136 232, 146 222, 147 200 C 148 178, 140 150, 120 150 Z" fill={C.cream} />
            <path d="M70 178 q8 2 12 -2 M68 194 q8 3 13 -1 M170 178 q-8 2 -12 -2 M172 194 q-8 3 -13 -1" stroke={C.furDark} strokeWidth="5" strokeLinecap="round" fill="none" />
          </g>
          <ellipse cx="100" cy="229" rx="17" ry="10" fill={C.cream} />
          <ellipse cx="140" cy="229" rx="17" ry="10" fill={C.cream} />
          <path d="M94 232v4M100 233v4M106 232v4M134 232v4M140 233v4M146 232v4" stroke={C.ink} strokeWidth="1.6" strokeLinecap="round" opacity=".35" />
        </g>

        {/* 頭 */}
        <g transform={`translate(0 ${headDy})`}>
          <g className="cat__head">
            {(stage === "young" || stage === "adult" || stage === "master") && (
              <path
                d="M80 138 Q120 174 160 138"
                fill="none"
                stroke={stage === "master" ? "#7a4fa0" : stage === "adult" ? "#3f8f86" : "#d9534a"}
                strokeWidth="11"
                strokeLinecap="round"
              />
            )}
            <g className="cat__ear cat__ear--l">
              <path d="M70 80 L76 30 L116 60 Z" fill={C.fur} stroke={C.fur} strokeWidth="10" strokeLinejoin="round" />
              <path d="M79 70 L82 43 L103 59 Z" fill={C.pink} stroke={C.pink} strokeWidth="4" strokeLinejoin="round" />
            </g>
            <g className="cat__ear cat__ear--r">
              <path d="M170 80 L164 30 L124 60 Z" fill={C.fur} stroke={C.fur} strokeWidth="10" strokeLinejoin="round" />
              <path d="M161 70 L158 43 L137 59 Z" fill={C.pink} stroke={C.pink} strokeWidth="4" strokeLinejoin="round" />
            </g>
            <ellipse cx="120" cy="100" rx="64" ry="53" fill={C.fur} />
            {/* トラ模様 */}
            <path d="M120 50v15M105 53l3 13M135 53l-3 13" stroke={C.furDark} strokeWidth="7" strokeLinecap="round" />
            <path d="M58 96h13M59 109h11M182 96h-13M181 109h-11" stroke={C.furDark} strokeWidth="6" strokeLinecap="round" />
            {/* 口まわり */}
            <path d="M120 96 C 96 96, 86 114, 88 126 C 90 142, 104 150, 120 150 C 136 150, 150 142, 152 126 C 154 114, 144 96, 120 96 Z" fill={C.cream} />
            <ellipse className="cat__blush" cx="80" cy="120" rx="10" ry="6" fill={C.pink} opacity=".55" />
            <ellipse className="cat__blush" cx="160" cy="120" rx="10" ry="6" fill={C.pink} opacity=".55" />

            {/* 目（表情ごとに切り替え） */}
            <g className="cat__eyes cat__eyes--open">
              <g className="cat__eye">
                <ellipse cx="95" cy="99" rx="9" ry="11" fill={C.ink} />
                <circle cx="92" cy="95" r="3.4" fill="#fff" />
                <circle cx="98" cy="103" r="1.6" fill="#fff" opacity=".8" />
              </g>
              <g className="cat__eye">
                <ellipse cx="145" cy="99" rx="9" ry="11" fill={C.ink} />
                <circle cx="142" cy="95" r="3.4" fill="#fff" />
                <circle cx="148" cy="103" r="1.6" fill="#fff" opacity=".8" />
              </g>
            </g>
            <g className="cat__eyes cat__eyes--smile" fill="none" stroke={C.ink} strokeWidth="4.5" strokeLinecap="round">
              <path d="M85 102 Q95 89 105 102" />
              <path d="M135 102 Q145 89 155 102" />
            </g>
            <g className="cat__eyes cat__eyes--sad">
              <ellipse cx="95" cy="101" rx="8.5" ry="9" fill={C.ink} />
              <ellipse cx="145" cy="101" rx="8.5" ry="9" fill={C.ink} />
              <circle cx="92.5" cy="99" r="2.8" fill="#fff" />
              <circle cx="142.5" cy="99" r="2.8" fill="#fff" />
              {/* ハの字まゆ（しょんぼり） */}
              <path d="M82 93 Q92 86 104 85M158 93 Q148 86 136 85" stroke={C.ink} strokeWidth="3" strokeLinecap="round" fill="none" />
            </g>

            {/* 鼻と口 */}
            <path d="M114.5 112 h11 q1.5 0 .5 1.5 l-5 5.5 q-1 1-2 0 l-5-5.5 q-1-1.5 .5-1.500z" fill={C.pink} stroke="#d9837a" strokeWidth="1" />
            <g className="cat__mouth cat__mouth--closed" fill="none" stroke={C.ink} strokeWidth="2.8" strokeLinecap="round">
              <path d="M120 120v5" />
              <path d="M120 125 Q114 133 106 127" />
              <path d="M120 125 Q126 133 134 127" />
            </g>
            <g className="cat__mouth cat__mouth--open">
              <path d="M108 124 Q120 121 132 124 Q131 143 120 143 Q109 143 108 124 Z" fill="#8f3a36" stroke={C.ink} strokeWidth="2.4" strokeLinejoin="round" />
              <path d="M113 138 Q120 131 127 138 Q124 142 120 142 Q116 142 113 138 Z" fill="#f08d86" />
            </g>
            <path className="cat__whiskers" d="M84 124 L52 118 M84 130 L54 134 M156 124 L188 118 M156 130 L186 134" stroke={C.ink} strokeWidth="1.8" strokeLinecap="round" opacity=".45" />

            {/* アクセサリー */}
            {stage === "young" && (
              <g>
                <circle cx="120" cy="160" r="8.5" fill="#f2b544" stroke="#a8721c" strokeWidth="1.8" />
                <path d="M113 160h14M120 160v6" stroke="#a8721c" strokeWidth="1.8" strokeLinecap="round" />
              </g>
            )}
            {stage === "adult" && (
              <g stroke="#b9801f" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M120 160 L98 148 Q94 160 99 172 Z" fill="#f2b544" />
                <path d="M120 160 L142 148 Q146 160 141 172 Z" fill="#f2b544" />
                <circle cx="120" cy="160" r="7" fill="#f7cb6b" />
              </g>
            )}
            {stage === "master" && (
              <g>
                <path d="M120 150 l9 10 -9 12 -9-12z" fill="#7fd0c8" stroke="#2f7f77" strokeWidth="1.8" strokeLinejoin="round" />
                <g className="cat__crown">
                  <path d="M92 50 L88 20 L105 34 L120 12 L135 34 L152 20 L148 50 Z" fill="#f6c443" stroke="#a8721c" strokeWidth="2.4" strokeLinejoin="round" />
                  <path d="M92 50h56" stroke="#a8721c" strokeWidth="2.4" strokeLinecap="round" />
                  <rect x="92" y="42" width="56" height="9" rx="3" fill="#fbe08a" stroke="#a8721c" strokeWidth="2" />
                  <circle cx="120" cy="33" r="4.5" fill="#e8744f" stroke="#a8721c" strokeWidth="1.5" />
                  <circle cx="103" cy="46.5" r="2.5" fill="#7fd0c8" />
                  <circle cx="137" cy="46.5" r="2.5" fill="#7fd0c8" />
                  <circle cx="88" cy="19" r="3.5" fill="#fff6d8" stroke="#a8721c" strokeWidth="1.5" />
                  <circle cx="120" cy="11" r="3.5" fill="#fff6d8" stroke="#a8721c" strokeWidth="1.5" />
                  <circle cx="152" cy="19" r="3.5" fill="#fff6d8" stroke="#a8721c" strokeWidth="1.5" />
                </g>
              </g>
            )}
          </g>
        </g>
      </g>
    </svg>
  );
}
