type BrandWordmarkProps = {
  className?: string;
};

const BRAND_MARK_SRC = "/team-feedback-mark-32.png";

export function BrandWordmark({ className }: BrandWordmarkProps) {
  return (
    <span className={["brand-wordmark", className].filter(Boolean).join(" ")}>
      <img
        src={BRAND_MARK_SRC}
        alt=""
        aria-hidden="true"
        className="brand-wordmark__icon"
        width="18"
        height="18"
      />
      <span className="brand-wordmark__text">Team Feedback</span>
    </span>
  );
}
