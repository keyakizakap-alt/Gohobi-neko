"use client";

import { Cat } from "./Cat";
import { Modal } from "./Modal";
import { STAGES } from "@/lib/game";
import type { FeedOutcome } from "@/lib/types";

const CONFETTI = Array.from({ length: 18 }, (_, i) => i);
const SPARKS = Array.from({ length: 12 }, (_, i) => i);

export function LevelUpDialog({ outcome, name, onClose }: { outcome: FeedOutcome | null; name: string; onClose(): void }) {
  const evolved = outcome ? outcome.stageAfter !== outcome.stageBefore : false;
  const stage = outcome ? STAGES.find((s) => s.id === outcome.stageAfter) : undefined;
  return (
    <Modal open={outcome !== null} onClose={onClose} title={evolved ? "おおきくなった！" : "レベルアップ！"} variant="celebrate">
      {outcome && stage && (
        <div className={`levelup${evolved ? " levelup--evolve" : ""}`}>
          <div className="levelup__confetti" aria-hidden key={evolved ? "late" : "now"}>
            {CONFETTI.map((i) => (
              <i key={i} style={{ "--i": i } as React.CSSProperties} />
            ))}
          </div>
          {evolved ? (
            // 進化：前の姿が光に包まれ、フラッシュのあと新しい姿があらわれる
            <div className="evolve" data-testid="evolve-stage">
              <div className="evolve__rays" aria-hidden />
              <div className="evolve__cat evolve__cat--before" aria-hidden>
                <Cat stage={outcome.stageBefore} face="normal" animated={false} />
              </div>
              <div className="evolve__cat evolve__cat--after">
                <Cat stage={outcome.stageAfter} face="happy" title={`${stage.name}になった${name}`} />
              </div>
              <div className="evolve__flash" aria-hidden />
              <div className="evolve__sparks" aria-hidden>
                {SPARKS.map((i) => (
                  <i key={i} style={{ "--i": i } as React.CSSProperties} />
                ))}
              </div>
              <p className="evolve__teaser" aria-hidden>
                …{name}のようすが…？
              </p>
              <p className="evolve__badge">{stage.name}</p>
            </div>
          ) : (
            <div className="levelup__cat">
              <Cat stage={outcome.stageAfter} face="happy" />
            </div>
          )}
          <p className="levelup__level">
            Lv.{outcome.levelBefore} <span aria-hidden>→</span> <b data-testid="levelup-level">Lv.{outcome.levelAfter}</b>
          </p>
          {evolved ? (
            <p className="levelup__text">
              {name}は <b>「{stage.name}」</b> に成長しました。
              <br />
              {stage.description}
            </p>
          ) : (
            <p className="levelup__text">{name}は ごはんを食べて、すくすく育っています。</p>
          )}
          <button type="button" className="btn btn--primary btn--block" onClick={onClose}>
            やったね
          </button>
        </div>
      )}
    </Modal>
  );
}
