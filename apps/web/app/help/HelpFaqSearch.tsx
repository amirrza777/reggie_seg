"use client";

import { useEffect, useMemo, useState } from "react";
import { FaqAccordion } from "../components/FaqAccordion";

type FaqItem = {
  question: string;
  answer: string;
  links?: Array<{ label: string; href: string }>;
};

type FaqGroup = {
  id: string;
  title: string;
  description: string;
  items: FaqItem[];
};

type HelpFaqSearchProps = {
  groups: FaqGroup[];
  initialQuery?: string;
  initialOpenQuestion?: string;
};

const normalize = (value: string) => value.toLowerCase().trim();

export function HelpFaqSearch({ groups, initialQuery = "", initialOpenQuestion }: HelpFaqSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const groupWithOpenQuestion = useMemo(() => {
    if (!initialOpenQuestion) return undefined;
    return groups.find((group) =>
      group.items.some((item) => item.question === initialOpenQuestion),
    )?.id;
  }, [groups, initialOpenQuestion]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (!groupWithOpenQuestion) return {};
    return groups.reduce<Record<string, boolean>>((acc, group) => {
      acc[group.id] = group.id === groupWithOpenQuestion;
      return acc;
    }, {});
  });

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

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

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
          {filteredGroups.map((group) => {
            const isOpen = openGroups[group.id] ?? true;
            const groupOpenQuestion = group.id === groupWithOpenQuestion ? initialOpenQuestion : undefined;
            return (
              <section className="help-faq__group" aria-labelledby={group.id} key={group.id}>
                <details className="help-faq__group-shell" open={isOpen}>
                  <summary
                    className="help-faq__group-toggle"
                    onClick={(event) => {
                      event.preventDefault();
                      setOpenGroups((current) => ({
                        ...current,
                        [group.id]: !(current[group.id] ?? true),
                      }));
                    }}
                    aria-controls={`${group.id}-panel`}
                    aria-expanded={isOpen}
                  >
                    <span className="help-faq__group-title" id={group.id}>
                      {group.title}
                    </span>
                    <span className="help-faq__group-indicator" aria-hidden="true" />
                  </summary>
                  <div
                    id={`${group.id}-panel`}
                    className="help-faq__group-panel"
                    role="region"
                    aria-labelledby={group.id}
                  >
                    <p className="help-faq__lede muted">{group.description}</p>
                    <FaqAccordion
                      items={group.items}
                      reveal={false}
                      initialOpenQuestion={groupOpenQuestion}
                    />
                  </div>
                </details>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
