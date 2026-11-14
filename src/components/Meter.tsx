import type { ReactNode } from "react";

interface Props {
  label: string;
  /** 0〜1 */
  ratio: number;
  valueText: string;
  tone: "xp" | "food" | "mood" | "love";
  icon?: ReactNode;
  testId?: string;
}

export function Meter({ label, ratio, valueText, tone, icon, testId }: Props) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <div className="meter">
      <div className="meter__head">
        <span className="meter__label">
          {icon}
          {label}
        </span>
        <span className="meter__value" data-testid={testId}>
          {valueText}
        </span>
      </div>
      <div
        className={`meter__track meter__track--${tone}`}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="meter__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
