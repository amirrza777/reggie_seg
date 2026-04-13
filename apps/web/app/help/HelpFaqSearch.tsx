"use client";

import { useEffect, useMemo, useState } from "react";
import { FaqAccordion } from "@/shared/ui/faq/FaqAccordion";
import { searchHelpFaqs, type HelpFaqRecord } from "./api/search";
import { SEARCH_DEBOUNCE_MS, normalizeSearchQuery } from "@/shared/lib/search";
import { SearchField } from "@/shared/ui/SearchField";

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

export function HelpFaqSearch({ groups, initialQuery = "", initialOpenQuestion }: HelpFaqSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [matchedIds, setMatchedIds] = useState<Set<string> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const hasQuery = normalizeSearchQuery(query).length > 0;
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

  const searchableFaqRecords = useMemo<HelpFaqRecord[]>(
    () =>
      groups.flatMap((group) =>
        group.items.map((item) => ({
          id: toFaqRecordId(group.id, item.question),
          groupId: group.id,
          group: group.title,
          question: item.question,
          answer: item.answer,
          links: item.links,
        })),
      ),
    [groups],
  );

  const filteredGroups = useMemo(() => {
    if (!hasQuery || matchedIds === null) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => matchedIds.has(toFaqRecordId(group.id, item.question))),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, hasQuery, matchedIds]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!normalizeSearchQuery(trimmedQuery)) {
      setMatchedIds(null);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const results = await searchHelpFaqs(trimmedQuery, searchableFaqRecords, controller.signal);
        setMatchedIds(new Set(results.map((item) => item.id)));
      } catch (error) {
        if (isAbortError(error)) return;
        setMatchedIds(new Set());
        setSearchError("Search is temporarily unavailable.");
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [query, searchableFaqRecords]);

  return (
    <div className="help-faq">
      <div className="help-faq__search help-faq__search--wide">
        <label className="help-faq__search-label" htmlFor="faq-search">
          Search FAQs
        </label>
        <SearchField
          id="faq-search"
          className="help-faq__search-input"
          placeholder="Search by keyword"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <p className="muted help-faq__search-note">Filter answers across all help groups.</p>
      </div>

      {hasQuery && searchError ? (
        <p className="muted help-faq__empty">{searchError}</p>
      ) : hasQuery && isSearching && filteredGroups.length === 0 ? (
        <p className="muted help-faq__empty">Searching FAQs...</p>
      ) : filteredGroups.length === 0 ? (
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
                    <span className="help-faq__group-title-wrap" id={group.id}>
                      <span className="help-faq__group-title">{group.title}</span>
                      <span className="help-faq__group-count">
                        {group.items.length} {group.items.length === 1 ? "article" : "articles"}
                      </span>
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

function toFaqRecordId(groupId: string, question: string): string {
  return `${groupId}::${question}`;
}

function isAbortError(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return (value as { name?: string }).name === "AbortError";
}
