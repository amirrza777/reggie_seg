import { FaqAccordion } from "@/shared/ui/faq/FaqAccordion";
import { faqItems } from "@/marketing/content/marketing";
import Link from "next/link";
import type { CSSProperties } from "react";

type FaqItem = {
  question: string;
  answer: string;
};

type FaqSectionProps = {
  items?: FaqItem[];
  subheading?: string;
  reveal?: boolean;
  leftAligned?: boolean;
  showMoreLink?: boolean;
};

export const FaqSection = ({
  items = faqItems,
  subheading = "Everything about questionnaires, permissions, GitHub data, and compliance.",
  reveal = true,
  leftAligned = false,
  showMoreLink = true,
}: FaqSectionProps) => {
  const sectionClassName = ["section", leftAligned ? "faq-section--left" : null].filter(Boolean).join(" ");
  const containerClassName = ["container", "stack", leftAligned ? "faq-section__container--left" : null].filter(Boolean).join(" ");
  const moreLinkRevealStyle: CSSProperties | undefined = reveal
    ? ({ "--reveal-delay": `${120 + items.length * 70 + 90}ms` } as CSSProperties)
    : undefined;

  return (
    <section className={sectionClassName} id="faq">
      <div className={containerClassName}>
        <div className="section__header" data-reveal={reveal ? "" : undefined}>
          <h2>FAQs</h2>
          <p className="lede">{subheading}</p>
        </div>
        <FaqAccordion items={items} reveal={reveal} />
        {showMoreLink ? (
          <div data-reveal={reveal ? "" : undefined} style={moreLinkRevealStyle}>
            <Link className="link-ghost" href="/help">
              More FAQs
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
};
