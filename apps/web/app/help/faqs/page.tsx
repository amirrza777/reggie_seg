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
