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

  it("opens the first item by default", () => {
    render(<FaqAccordion items={items} reveal={false} />);
    const firstTrigger = screen.getByText("What is Team Feedback?");
    expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
  });

  it("toggles open question on trigger clicks", () => {
    render(<FaqAccordion items={items} reveal={false} />);
    const trigger = screen.getByText("How do I reset my password?");
    const wrapper = trigger.closest(".faq__item")?.parentElement;
    expect(wrapper).not.toHaveAttribute("data-reveal");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
