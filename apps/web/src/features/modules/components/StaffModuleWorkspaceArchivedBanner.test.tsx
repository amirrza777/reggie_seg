import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { StaffModuleWorkspaceArchivedBanner } from "./StaffModuleWorkspaceArchivedBanner";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("StaffModuleWorkspaceArchivedBanner", () => {
  it("links to staff archive for unarchive", () => {
    render(<StaffModuleWorkspaceArchivedBanner />);
    expect(screen.getByText(/This module is archived and read-only/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Unarchive it/i });
    expect(link).toHaveAttribute("href", "/staff/archive");
  });
});
