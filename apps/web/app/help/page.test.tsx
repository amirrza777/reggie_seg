import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import HelpPage from "./page";

vi.mock("./HelpOverviewSearch", () => ({
  HelpOverviewSearch: ({ items }: { items: unknown[] }) => (
    <div data-testid="help-overview-search" data-count={items.length} />
  ),
}));

vi.mock("./HelpTopQuestions", () => ({
  HelpTopQuestions: () => <div data-testid="help-top-questions">top questions</div>,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("HelpPage", () => {
  it("renders overview header, search, topic cards, and top questions section", () => {
    render(<HelpPage />);

    expect(screen.getByRole("heading", { level: 2, name: "Overview" })).toBeInTheDocument();
    expect(screen.getByTestId("help-overview-search")).toHaveAttribute("data-count");
    expect(screen.getByTestId("help-top-questions")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Getting Started/i })).toHaveAttribute("href", "/help/getting-started");
    expect(screen.getByRole("link", { name: /Account & Access/i })).toHaveAttribute("href", "/help/account-access");
    expect(screen.getByRole("link", { name: /Roles & Permissions/i })).toHaveAttribute("href", "/help/roles-permissions");
    expect(screen.getByRole("link", { name: /FAQs/i })).toHaveAttribute("href", "/help/faqs");
    expect(screen.getByRole("link", { name: /Support/i })).toHaveAttribute("href", "/help/support");
    expect(screen.getByText("Browse by topic")).toBeInTheDocument();
  });
});
