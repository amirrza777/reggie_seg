import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { MeetingList } from "./MeetingList";
import type { StaffMeeting } from "../types";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const listCtx = { projectId: 10, teamId: 20 };

function makeMeeting(overrides: Partial<StaffMeeting> = {}): StaffMeeting {
  return {
    id: 1,
    teamId: 1,
    organiserId: 1,
    title: "Team Meeting",
    subject: null,
    location: null,
    videoCallLink: null,
    agenda: null,
    date: "2026-01-15T10:00:00Z",
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-01-15T10:00:00Z",
    organiser: { id: 1, firstName: "Alice", lastName: "Smith" },
    participants: [],
    attendances: [],
    minutes: null,
    comments: [],
    ...overrides,
  };
}

describe("MeetingList", () => {
  it("shows empty message when there are no meetings", () => {
    render(<MeetingList meetings={[]} {...listCtx} />);
    expect(screen.getByText("No meetings recorded yet.")).toBeInTheDocument();
  });

  it("renders meeting title and organiser name", () => {
    render(<MeetingList meetings={[makeMeeting()]} {...listCtx} />);
    expect(screen.getByText("Team Meeting")).toBeInTheDocument();
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("links each meeting title to the staff meeting minutes page", () => {
    render(<MeetingList meetings={[makeMeeting({ id: 77, title: "Stand-up" })]} {...listCtx} />);
    expect(screen.getByRole("link", { name: "Stand-up" })).toHaveAttribute(
      "href",
      "/staff/projects/10/teams/20/meetings/77/minutes",
    );
  });

  it("shows not recorded when attendance is empty", () => {
    render(<MeetingList meetings={[makeMeeting({ attendances: [] })]} {...listCtx} />);
    expect(screen.getByText("Not recorded")).toBeInTheDocument();
  });

  it("shows attendance count when attendance is recorded", () => {
    const attendances = [
      { id: 1, meetingId: 1, userId: 1, status: "on_time", user: { id: 1, firstName: "Alice", lastName: "Smith" } },
      { id: 2, meetingId: 1, userId: 2, status: "absent", user: { id: 2, firstName: "Bob", lastName: "Jones" } },
    ];
    render(<MeetingList meetings={[makeMeeting({ attendances })]} {...listCtx} />);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("shows minutes writer name when minutes exist", () => {
    const minutes = { id: 1, meetingId: 1, writerId: 2, writer: { id: 2, firstName: "Bob", lastName: "Jones" }, content: "", createdAt: "", updatedAt: "" };
    render(<MeetingList meetings={[makeMeeting({ minutes })]} {...listCtx} />);
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
  });

  it("shows No when there are no minutes", () => {
    render(<MeetingList meetings={[makeMeeting({ minutes: null })]} {...listCtx} />);
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("sorts by title when the title header is clicked", () => {
    const meetings = [
      makeMeeting({ id: 1, title: "Zulu Meeting" }),
      makeMeeting({ id: 2, title: "Alpha Meeting" }),
    ];
    render(<MeetingList meetings={meetings} {...listCtx} />);

    fireEvent.click(screen.getByText("Title"));

    const alpha = screen.getByText("Alpha Meeting");
    const zulu = screen.getByText("Zulu Meeting");
    expect(alpha.compareDocumentPosition(zulu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sorts by attendance rate when the attendance header is clicked", () => {
    const meetings = [
      makeMeeting({ id: 1, title: "Low", attendances: [{ id: 1, meetingId: 1, userId: 1, status: "absent", user: { id: 1, firstName: "A", lastName: "A" } }] }),
      makeMeeting({ id: 2, title: "High", attendances: [{ id: 2, meetingId: 2, userId: 2, status: "on_time", user: { id: 2, firstName: "B", lastName: "B" } }] }),
    ];
    render(<MeetingList meetings={meetings} {...listCtx} />);

    fireEvent.click(screen.getByText("Attendance"));

    const low = screen.getByText("Low");
    const high = screen.getByText("High");
    expect(low.compareDocumentPosition(high) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sorts by minutes when the minutes header is clicked", () => {
    const minutes = { id: 1, meetingId: 1, writerId: 1, writer: { id: 1, firstName: "Alice", lastName: "Smith" }, content: "", createdAt: "", updatedAt: "" };
    const meetings = [
      makeMeeting({ id: 1, title: "Has Minutes", minutes }),
      makeMeeting({ id: 2, title: "No Minutes", minutes: null }),
    ];
    render(<MeetingList meetings={meetings} {...listCtx} />);

    fireEvent.click(screen.getByText("Minutes"));

    const noMinutes = screen.getByText("No Minutes");
    const hasMinutes = screen.getByText("Has Minutes");
    expect(noMinutes.compareDocumentPosition(hasMinutes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("reverses sort direction when the same header is clicked twice", () => {
    const meetings = [
      makeMeeting({ id: 1, title: "Zulu Meeting" }),
      makeMeeting({ id: 2, title: "Alpha Meeting" }),
    ];
    render(<MeetingList meetings={meetings} {...listCtx} />);

    fireEvent.click(screen.getByText("Title"));
    fireEvent.click(screen.getByText("Title"));

    const alpha = screen.getByText("Alpha Meeting");
    const zulu = screen.getByText("Zulu Meeting");
    expect(zulu.compareDocumentPosition(alpha) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sorts by attendance rate treating empty attendances as zero", () => {
    const attendance = (id: number) => ({ id, meetingId: id, userId: id, status: "on_time", user: { id, firstName: "A", lastName: "A" } });
    const meetings = [
      makeMeeting({ id: 1, title: "No Attendance", attendances: [] }),
      makeMeeting({ id: 2, title: "Full Attendance", attendances: [attendance(2)] }),
      makeMeeting({ id: 3, title: "Also Full", attendances: [attendance(3)] }),
    ];
    render(<MeetingList meetings={meetings} {...listCtx} />);

    fireEvent.click(screen.getByText("Attendance"));

    expect(screen.getByText("No Attendance")).toBeInTheDocument();
  });

  it("toggles date sort from desc to asc when date header is clicked", () => {
    const meetings = [
      makeMeeting({ id: 1, title: "Earlier", date: "2026-01-01T10:00:00Z" }),
      makeMeeting({ id: 2, title: "Later", date: "2026-06-01T10:00:00Z" }),
    ];
    render(<MeetingList meetings={meetings} {...listCtx} />);

    fireEvent.click(screen.getByText("Date"));

    const earlier = screen.getByText("Earlier");
    const later = screen.getByText("Later");
    expect(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sorts by organiser when the organiser header is clicked", () => {
    const meetings = [
      makeMeeting({ id: 1, title: "Meeting A", organiser: { id: 2, firstName: "Zara", lastName: "Jones" } }),
      makeMeeting({ id: 2, title: "Meeting B", organiser: { id: 1, firstName: "Alice", lastName: "Smith" } }),
    ];
    render(<MeetingList meetings={meetings} {...listCtx} />);

    fireEvent.click(screen.getByText("Organiser"));

    const alice = screen.getByText("Alice Smith");
    const zara = screen.getByText("Zara Jones");
    expect(alice.compareDocumentPosition(zara) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
