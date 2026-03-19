import { HelpFaqSearch } from "../HelpFaqSearch";
import { faqGroups } from "../helpFaqData";

type HelpFaqPageProps = {
  searchParams?: Promise<{ q?: string; open?: string }>;
};

export default async function HelpFaqPage({ searchParams }: HelpFaqPageProps) {
  const params = await searchParams;
  const initialQuery = params?.q ? decodeURIComponent(params.q) : "";
  const initialOpenQuestion = params?.open ? decodeURIComponent(params.open) : undefined;
  return (
    <section className="help-section help-section--faq stack" aria-label="FAQs">
      <header className="help-section__header stack">
        <h2>FAQs</h2>
        <p className="lede">Search by keyword or browse by role.</p>
      </header>

      <HelpFaqSearch
        groups={faqGroups}
        initialQuery={initialQuery}
        initialOpenQuestion={initialOpenQuestion}
      />
    </section>
  );
}
