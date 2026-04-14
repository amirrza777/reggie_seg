import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HelpFaqPage from "./page";

const helpFaqSearchSpy = vi.fn();

vi.mock("../HelpFaqSearch", () => ({
  HelpFaqSearch: (props: Record<string, unknown>) => {
    helpFaqSearchSpy(props);
    return <div data-testid="help-faq-search" />;
  },
}));

vi.mock("../helpFaqData", () => ({
  faqGroups: [{ id: "group-1", title: "General", description: "Desc", items: [] }],
}));

describe("HelpFaqPage", () => {
  it("renders FAQ section and forwards decoded search params", async () => {
    const page = await HelpFaqPage({
      searchParams: Promise.resolve({ q: "peer%20feedback", open: "How%20does%20this%20work%3F" }),
    });
    render(page);

    expect(screen.getByRole("heading", { level: 2, name: "FAQs" })).toBeInTheDocument();
    expect(screen.getByTestId("help-faq-search")).toBeInTheDocument();
    expect(helpFaqSearchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: expect.arrayContaining([expect.objectContaining({ id: "group-1" })]),
        initialQuery: "peer feedback",
        initialOpenQuestion: "How does this work?",
      }),
    );
  });

  it("uses empty defaults when query params are missing", async () => {
    const page = await HelpFaqPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(helpFaqSearchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        initialQuery: "",
        initialOpenQuestion: undefined,
      }),
    );
  });
});
