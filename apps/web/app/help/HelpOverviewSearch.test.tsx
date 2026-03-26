import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEARCH_DEBOUNCE_MS } from "@/shared/lib/search";
import { searchHelpOverview } from "./api/search";
import { HelpOverviewSearch } from "./HelpOverviewSearch";

vi.mock("./api/search", () => ({
  searchHelpOverview: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const searchHelpOverviewMock = vi.mocked(searchHelpOverview);

const items = [
  {
    id: "faq-1",
    title: "How to join a team",
    description: "Find invitations and pending team requests.",
    href: "/help/faqs",
    kind: "faq" as const,
    group: "FAQs",
  },
  {
    id: "guide-1",
    title: "Open module dashboard",
    description: "Locate module pages from staff workspace.",
    href: "/help/getting-started",
    kind: "topic" as const,
    group: "Getting Started",
  },
];

async function flushDebounce() {
  await act(async () => {
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 1);
  });
}

async function flushAsyncSearch() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("HelpOverviewSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders results and builds FAQ/result links", async () => {
    searchHelpOverviewMock.mockResolvedValue([
      {
        id: "faq-1",
        title: "How to join a team",
        description: "Find invitations and pending team requests.",
        href: "/help/faqs",
        kind: "faq",
        group: "FAQs",
      },
      {
        id: "guide-1",
        title: "Open module dashboard",
        description: "Locate module pages from staff workspace.",
        href: "/help/getting-started",
        kind: "topic",
        group: "Getting Started",
      },
    ]);

    render(<HelpOverviewSearch items={items} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search help" }), { target: { value: "team" } });
    await flushDebounce();
    await flushAsyncSearch();

    expect(searchHelpOverviewMock).toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 3, name: "Results" })).toBeInTheDocument();
    expect(screen.getByText("2 matches")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /How to join a team/i })).toHaveAttribute(
      "href",
      "/help/faqs?q=team&open=How%20to%20join%20a%20team",
    );
    expect(screen.getByRole("link", { name: /Open module dashboard/i })).toHaveAttribute(
      "href",
      "/help/getting-started",
    );
  });

  it("shows empty-state message when no results are found", async () => {
    searchHelpOverviewMock.mockResolvedValue([]);
    render(<HelpOverviewSearch items={items} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search help" }), {
      target: { value: "unknown-topic" },
    });
    await flushDebounce();
    await flushAsyncSearch();

    expect(searchHelpOverviewMock).toHaveBeenCalled();
    expect(screen.getByText('No help topics match "unknown-topic".')).toBeInTheDocument();
  });

  it("shows searching state while request is in flight", async () => {
    let resolveSearch: ((value: unknown) => void) | null = null;
    const pending = new Promise((resolve) => {
      resolveSearch = resolve;
    });
    searchHelpOverviewMock.mockReturnValue(pending as ReturnType<typeof searchHelpOverview>);

    render(<HelpOverviewSearch items={items} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search help" }), { target: { value: "team" } });

    await flushDebounce();

    expect(screen.getByText("Searching help content...")).toBeInTheDocument();

    await act(async () => {
      resolveSearch?.([]);
      await pending;
    });
  });

  it("shows service error for non-abort failures and ignores abort errors", async () => {
    searchHelpOverviewMock.mockRejectedValueOnce(new Error("service down"));

    const { rerender } = render(<HelpOverviewSearch items={items} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search help" }), { target: { value: "team" } });
    await flushDebounce();
    await flushAsyncSearch();
    expect(screen.getByText("Search is temporarily unavailable.")).toBeInTheDocument();

    searchHelpOverviewMock.mockRejectedValueOnce({ name: "AbortError" });
    rerender(<HelpOverviewSearch items={items} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search help" }), { target: { value: "another" } });
    await flushDebounce();
    await flushAsyncSearch();
    expect(searchHelpOverviewMock).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Search is temporarily unavailable.")).not.toBeInTheDocument();
  });
});
