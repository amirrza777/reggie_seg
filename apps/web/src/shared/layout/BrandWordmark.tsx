type BrandWordmarkProps = {
  className?: string;
};

export function BrandWordmark({ className }: BrandWordmarkProps) {
  return (
    <span className={["brand-wordmark", className].filter(Boolean).join(" ")}>
      <img src="/favicon-32x32.png" alt="" aria-hidden="true" className="brand-wordmark__icon" />
      <span className="brand-wordmark__text">Team Feedback</span>
    </span>
  );
}
