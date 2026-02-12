import { FaqAccordion } from "../../components/FaqAccordion";
import { faqItems } from "../../content/marketing";

export const FaqSection = () => (
  <section className="section" id="faq">
    <div className="container stack">
      <div className="section__header" data-reveal>
        <h2>FAQ</h2>
        <p className="lede">Everything about questionnaires, permissions, GitHub data, and compliance.</p>
      </div>
      <FaqAccordion items={faqItems} />
    </div>
  </section>
);
