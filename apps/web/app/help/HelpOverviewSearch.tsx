"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { HelpSearchItem } from "./helpFaqData";

type HelpOverviewSearchProps = {
  items: HelpSearchItem[];
};

const normalize = (value: string) => value.toLowerCase().trim();

export function HelpOverviewSearch({ items }: HelpOverviewSearchProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return [];
    return items.filter((item) =>
      normalize(`${item.title} ${item.description ?? ""} ${item.group ?? ""}`).includes(needle),
    );
  }, [items, query]);

  const buildHref = (item: HelpSearchItem) => {
    if (item.kind === "faq") {
      return `/help/faqs?q=${encodeURIComponent(query)}&open=${encodeURIComponent(item.title)}`;
    }
    return item.href;
  };

  return (
    <section className="help-hub__search" aria-label="Search help">
      <div className="help-faq__search">
        <label className="help-faq__search-label" htmlFor="help-overview-search">
          Search help
        </label>
        <input
          id="help-overview-search"
          className="help-faq__search-input"
          type="search"
          placeholder="Search topics, tasks, and FAQs"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {query ? (
        results.length > 0 ? (
          <div className="help-hub__tasks" aria-live="polite">
            <h3>Results</h3>
            <div className="help-hub__tasks-grid">
              {results.slice(0, 12).map((item) => (
                <Link
                  key={item.id}
                  href={buildHref(item)}
                  className="link-ghost"
                >
                  {item.title}
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
