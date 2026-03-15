"use client";

type HelpContactCtaProps = {
  label: string;
  href: string;
};

export function HelpContactCta({ label, href }: HelpContactCtaProps) {
  return (
    <div className="help-support__cta-wrap">
      <a className="btn btn--primary btn--sm help-support__cta" href={href}>
        {label}
      </a>
    </div>
  );
}
