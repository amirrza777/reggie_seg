import { HelpFaqSearch } from "../HelpFaqSearch";
import { faqGroups } from "../helpFaqData";

type HelpFaqPageProps = {
  searchParams?: { q?: string; open?: string };
};

export default function HelpFaqPage({ searchParams }: HelpFaqPageProps) {
  const initialQuery = searchParams?.q ? decodeURIComponent(searchParams.q) : "";
  const initialOpenQuestion = searchParams?.open ? decodeURIComponent(searchParams.open) : undefined;
  return (
    <section className="help-section stack" aria-label="FAQs">
      <div>
        <h2>FAQs</h2>
        <p className="lede">Search by keyword or browse by role.</p>
      </div>

      <HelpFaqSearch
        groups={faqGroups}
        initialQuery={initialQuery}
        initialOpenQuestion={initialOpenQuestion}
      />
    </section>
  );
}
