import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { HelpTopQuestions } from "./HelpTopQuestions";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("HelpTopQuestions", () => {
  it("renders all top question cards with expected links", () => {
    render(<HelpTopQuestions />);

    expect(screen.getByRole("heading", { level: 3, name: "Top questions" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Reset password/i })).toHaveAttribute("href", "/help/account-access");
    expect(screen.getByRole("link", { name: /Find meeting schedules/i })).toHaveAttribute(
      "href",
      "/help/faqs?q=meeting&open=How%20do%20I%20view%20my%20team%27s%20meeting%20schedule%3F",
    );
    expect(screen.getByRole("link", { name: /Complete peer assessment/i })).toHaveAttribute(
      "href",
      "/help/faqs?q=peer%20assessment&open=Where%20do%20I%20see%20my%20peer%20assessment%3F",
    );
    expect(screen.getByRole("link", { name: /Check my role/i })).toHaveAttribute("href", "/help/roles-permissions");
    expect(screen.getAllByText("Open")).toHaveLength(4);
  });
});
