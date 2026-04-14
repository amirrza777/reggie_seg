import "./AgreementTrafficLightPill.css";

export type AgreementTrafficTier = "low" | "mid" | "high";

export function agreementScoreToTier(score: number): AgreementTrafficTier {
  const s = Math.min(5, Math.max(1, Math.round(Number.isFinite(score) ? score : 3)));
  if (s <= 2) return "low";
  if (s === 3) return "mid";
  return "high";
}

type AgreementTrafficLightPillProps = {
  score: number;
  selected: string;
  className?: string;
};

export function AgreementTrafficLightPill({ score, selected, className }: AgreementTrafficLightPillProps) {
  const tier = agreementScoreToTier(score);
  const label = selected.trim().length > 0 ? selected.trim() : "—";
  const title = `${label} (${score}/5)`;
  return (
    <span
      className={`agreementTrafficPill agreementTrafficPill--${tier}${className ? ` ${className}` : ""}`}
      title={title}
    >
      {label}
    </span>
  );
}
