import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEARCH_DEBOUNCE_MS } from "@/shared/lib/search";
import { searchHelpFaqs } from "./api/search";
import { HelpFaqSearch } from "./HelpFaqSearch";

vi.mock("./api/search", () => ({
  searchHelpFaqs: vi.fn(),
}));

vi.mock("@/shared/ui/SearchField", () => ({
  SearchField: (props: Record<string, unknown>) => <input role="searchbox" {...props} />,
}));

vi.mock("@/shared/ui/faq/FaqAccordion", () => ({
  FaqAccordion: ({ items, initialOpenQuestion }: { items: Array<{ question: string }>; initialOpenQuestion?: string }) => (
    <div data-testid="faq-accordion" data-count={items.length} data-open-question={initialOpenQuestion ?? ""} />
  ),
}));

const searchHelpFaqsMock = vi.mocked(searchHelpFaqs);

const groups = [
  {
    id: "group-a",
    title: "Getting started",
    description: "Basics",
    items: [
      { question: "How do I join?", answer: "Use invite" },
      { question: "How do I reset password?", answer: "Use reset" },
    ],
  },
  {
    id: "group-b",
    title: "Assessments",
    description: "Workflow",
    items: [{ question: "Where is peer assessment?", answer: "Project page" }],
  },
] as any;

async function flushDebounceAndPromises() {
  await act(async () => {
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 1);
    await Promise.resolve();
  });
}

describe("HelpFaqSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    searchHelpFaqsMock.mockResolvedValue([] as any);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("renders grouped FAQs and opens group containing the requested question", () => {
    const { container } = render(
      <HelpFaqSearch groups={groups} initialOpenQuestion="Where is peer assessment?" />,
    );

    const detailShells = container.querySelectorAll("details.help-faq__group-shell");
    expect(detailShells).toHaveLength(2);
    expect(detailShells[0]).not.toHaveAttribute("open");
    expect(detailShells[1]).toHaveAttribute("open");
    expect(screen.getAllByTestId("faq-accordion")[1]).toHaveAttribute("data-open-question", "Where is peer assessment?");
  });

  it("filters groups using debounced search results and supports group toggle", async () => {
    searchHelpFaqsMock.mockResolvedValue([
      {
        id: "group-a::How do I join?",
        groupId: "group-a",
        group: "Getting started",
        question: "How do I join?",
        answer: "Use invite",
      },
    ] as any);

    render(<HelpFaqSearch groups={groups} initialQuery="join" />);

    await flushDebounceAndPromises();
    expect(searchHelpFaqsMock).toHaveBeenCalledWith(
      "join",
      expect.any(Array),
      expect.any(AbortSignal),
    );

    const accordions = screen.getAllByTestId("faq-accordion");
    expect(accordions).toHaveLength(1);
    expect(accordions[0]).toHaveAttribute("data-count", "1");

    fireEvent.click(screen.getByText("Getting started"));
    expect(screen.getByText("Getting started").closest("summary")).toHaveAttribute("aria-expanded", "false");
  });

  it("shows loading, empty, and error states for search lifecycle", async () => {
    render(<HelpFaqSearch groups={groups} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search FAQs" }), { target: { value: "nomatch" } });

    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 1);
      await Promise.resolve();
    });
    expect(screen.getByText('No FAQs match "nomatch".')).toBeInTheDocument();

    let resolveSearch: ((value: unknown) => void) | null = null;
    const pending = new Promise((resolve) => {
      resolveSearch = resolve;
    });
    searchHelpFaqsMock.mockReturnValueOnce(pending as any);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search FAQs" }), { target: { value: "peer" } });
    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS + 1);
    });
    expect(screen.getByText("Searching FAQs...")).toBeInTheDocument();

    await act(async () => {
      resolveSearch?.([]);
      await pending;
    });
    expect(screen.getByText('No FAQs match "peer".')).toBeInTheDocument();

    searchHelpFaqsMock.mockRejectedValueOnce(new Error("service down"));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search FAQs" }), { target: { value: "team" } });
    await flushDebounceAndPromises();
    expect(screen.getByText("Search is temporarily unavailable.")).toBeInTheDocument();
  });
});
