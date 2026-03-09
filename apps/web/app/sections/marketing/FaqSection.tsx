import { FaqAccordion } from "../../components/FaqAccordion";
import { faqItems } from "../../content/marketing";
import Link from "next/link";

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

  return (
    <section className={sectionClassName} id="faq">
      <div className={containerClassName}>
      <div className="section__header" data-reveal={reveal ? "" : undefined}>
        <h2>FAQs</h2>
        <p className="lede">{subheading}</p>
      </div>
      <FaqAccordion items={items} reveal={reveal} />
      {showMoreLink ? (
        <div>
          <Link className="link-ghost" href="/help">
            More FAQs
          </Link>
        </div>
      ) : null}
      </div>
    </section>
  );
};
