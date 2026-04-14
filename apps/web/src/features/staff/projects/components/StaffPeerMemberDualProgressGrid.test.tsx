import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { formatDate } from "@/shared/lib/formatDate";
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

  it("links the title and body to the student href and shows Standard badge with formatted date", () => {
    const dueIso = "2026-05-01T12:00:00.000Z";
    const studentHref = "/staff/projects/1/teams/9/peer-assessment/2";
    const items: StaffPeerMemberDualProgressItem[] = [
      {
        id: 2,
        title: "Linked round",
        givenSubmitted: 5,
        givenExpected: 5,
        receivedSubmitted: 2,
        receivedExpected: 4,
        deadline: { dateLabel: formatDate(dueIso), profile: "STANDARD" },
        href: studentHref,
      },
    ];
    render(<StaffPeerMemberDualProgressGrid items={items} />);
    const studentLinks = screen.getAllByRole("link").filter((el) => el.getAttribute("href") === studentHref);
    expect(studentLinks).toHaveLength(2);
    expect(screen.getByText(formatDate(dueIso))).toBeInTheDocument();
    expect(screen.getByText("Standard")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("shows MCF badge next to the date", () => {
    const items: StaffPeerMemberDualProgressItem[] = [
      {
        id: 3,
        title: "MCF student",
        givenSubmitted: 0,
        givenExpected: 1,
        receivedSubmitted: 0,
        receivedExpected: 1,
        deadline: { dateLabel: formatDate("2026-06-01T12:00:00.000Z"), profile: "MCF" },
      },
    ];
    render(<StaffPeerMemberDualProgressGrid items={items} />);
    expect(screen.getByText("MCF")).toBeInTheDocument();
    expect(screen.getByText(formatDate("2026-06-01T12:00:00.000Z"))).toBeInTheDocument();
  });
});
