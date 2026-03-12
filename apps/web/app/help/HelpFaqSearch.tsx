"use client";

import { useMemo, useState } from "react";
import { FaqAccordion } from "../components/FaqAccordion";

type FaqItem = {
  question: string;
  answer: string;
};

type FaqGroup = {
  id: string;
  title: string;
  description: string;
  items: FaqItem[];
};

type HelpFaqSearchProps = {
  groups: FaqGroup[];
};

const normalize = (value: string) => value.toLowerCase().trim();

export function HelpFaqSearch({ groups }: HelpFaqSearchProps) {
  const [query, setQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          normalize(`${item.question} ${item.answer}`).includes(needle),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  return (
    <div className="help-faq">
      <div className="help-faq__search">
        <label className="help-faq__search-label" htmlFor="faq-search">
          Search FAQs
        </label>
        <input
          id="faq-search"
          className="help-faq__search-input"
          type="search"
          placeholder="Search by keyword"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {filteredGroups.length === 0 ? (
        <p className="muted help-faq__empty">No FAQs match "{query}".</p>
      ) : (
        <div className="help-faq__groups">
          {filteredGroups.map((group) => (
            <section className="help-faq__group" aria-labelledby={group.id} key={group.id}>
              <h3 className="help-page__subheading help-faq__heading" id={group.id}>
                {group.title}
              </h3>
              <p className="help-faq__lede muted">{group.description}</p>
              <FaqAccordion items={group.items} reveal={false} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
