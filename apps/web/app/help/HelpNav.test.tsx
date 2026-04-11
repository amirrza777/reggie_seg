import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { HelpNav } from "./HelpNav";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className, ...props }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

const usePathnameMock = vi.mocked(usePathname);

describe("HelpNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks the current help section as active", () => {
    usePathnameMock.mockReturnValue("/help/faqs");
    render(<HelpNav />);

    const activeLink = screen.getByRole("link", { name: "FAQs" });
    expect(activeLink).toHaveAttribute("aria-current", "page");
    expect(activeLink.className).toContain("help-nav__link--active");
  });

  it("renders all section links and leaves them inactive when pathname does not match", () => {
    usePathnameMock.mockReturnValue("/help/unknown");
    render(<HelpNav />);

    expect(screen.getByRole("navigation", { name: "Help sections" })).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(6);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/help");
    expect(screen.getByRole("link", { name: "Support" })).toHaveAttribute("href", "/help/support");
    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
  });
});
