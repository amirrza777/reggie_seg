"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { searchHelpOverview, type HelpOverviewRecord } from "./api/search";
import type { HelpSearchItem } from "./helpFaqData";
import { SEARCH_DEBOUNCE_MS, normalizeSearchQuery } from "@/shared/lib/search";
import { SearchField } from "@/shared/ui/SearchField";

type HelpOverviewSearchProps = {
  items: HelpSearchItem[];
};

export function HelpOverviewSearch({ items }: HelpOverviewSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HelpOverviewRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const hasQuery = normalizeSearchQuery(query).length > 0;

  const records = useMemo<HelpOverviewRecord[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        href: item.href,
        kind: item.kind,
        group: item.group,
      })),
    [items],
  );

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!normalizeSearchQuery(trimmedQuery)) {
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const next = await searchHelpOverview(trimmedQuery, records, controller.signal);
        setResults(next);
      } catch (error) {
        if (isAbortError(error)) return;
        setResults([]);
        setSearchError("Search is temporarily unavailable.");
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [query, records]);

  const buildHref = (item: HelpOverviewRecord) => {
    if (item.kind === "faq") {
      return `/help/faqs?q=${encodeURIComponent(query)}&open=${encodeURIComponent(item.title)}`;
    }
    return item.href;
  };

  return (
    <section className="help-hub__search" aria-label="Search help" id="search">
      <div className="help-faq__search">
        <label className="help-faq__search-label" htmlFor="help-overview-search">
          Search help
        </label>
        <SearchField
          id="help-overview-search"
          className="help-faq__search-input"
          placeholder="Search topics, tasks, and FAQs"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {hasQuery ? (
        searchError ? (
          <p className="muted help-faq__empty">{searchError}</p>
        ) : isSearching && results.length === 0 ? (
          <p className="muted help-faq__empty">Searching help content...</p>
        ) : results.length > 0 ? (
          <div className="help-hub__tasks help-hub__tasks--results" aria-live="polite">
            <div className="help-hub__tasks-head">
              <h3>Results</h3>
              <p className="muted">
                {results.length} {results.length === 1 ? "match" : "matches"}
              </p>
            </div>
            <div className="help-hub__tasks-grid">
              {results.slice(0, 12).map((item) => (
                <Link key={item.id} href={buildHref(item)} className="help-hub__result-link">
                  <span>{item.title}</span>
                  <span className="help-hub__result-group">{item.group ?? "Help topic"}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <p className="muted help-faq__empty">No help topics match "{query}".</p>
        )
      ) : null}
    </section>
  );
}

function isAbortError(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return (value as { name?: string }).name === "AbortError";
}
