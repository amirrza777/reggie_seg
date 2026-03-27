import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FaqAccordion } from "./FaqAccordion";

const items = [
  {
    question: "What is Team Feedback?",
    answer: "A peer-assessment platform.",
    links: [{ label: "Learn more", href: "/help" }],
  },
  {
    question: "How do I reset my password?",
    answer: "Use the forgot password flow.",
  },
];

describe("FaqAccordion", () => {
  it("opens the requested initial question and renders links", () => {
    render(<FaqAccordion items={items} initialOpenQuestion="What is Team Feedback?" />);
    expect(screen.getByText("A peer-assessment platform.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Learn more" })).toHaveAttribute("href", "/help");
  });

  it("toggles open question on summary clicks", () => {
    render(<FaqAccordion items={items} reveal={false} />);
    const summary = screen.getByText("How do I reset my password?");
    const details = summary.closest("details");
    expect(details).not.toHaveAttribute("data-reveal");

    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");

    fireEvent.click(summary);
    expect(details).not.toHaveAttribute("open");
  });
});
