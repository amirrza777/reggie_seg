import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  StaffPeerMemberDualProgressGrid,
  type StaffPeerMemberDualProgressItem,
} from "./StaffPeerMemberDualProgressGrid";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

describe("StaffPeerMemberDualProgressGrid", () => {
  it("renders progress copy, clamps percentages, and uses deadline fallback when no href", () => {
    const items: StaffPeerMemberDualProgressItem[] = [
      {
        id: 1,
        title: "Round one",
        givenSubmitted: 3,
        givenExpected: 4,
        receivedSubmitted: 0,
        receivedExpected: 0,
      },
    ];
    render(<StaffPeerMemberDualProgressGrid items={items} />);
    expect(screen.getByRole("heading", { name: "Round one" })).toBeInTheDocument();
    expect(screen.getByText("Deadline not set")).toBeInTheDocument();
    expect(screen.getByText("3/4 submitted")).toBeInTheDocument();
    expect(screen.getByText("0/0 received")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("wraps card in a link when href is set", () => {
    const items: StaffPeerMemberDualProgressItem[] = [
      {
        id: 2,
        title: "Linked round",
        givenSubmitted: 5,
        givenExpected: 5,
        receivedSubmitted: 2,
        receivedExpected: 4,
        deadline: "2026-05-01",
        href: "/staff/projects/1/peer/2",
      },
    ];
    render(<StaffPeerMemberDualProgressGrid items={items} />);
    const link = screen.getByRole("link", { name: /Linked round/i });
    expect(link).toHaveAttribute("href", "/staff/projects/1/peer/2");
    expect(screen.getByText("2026-05-01")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});
