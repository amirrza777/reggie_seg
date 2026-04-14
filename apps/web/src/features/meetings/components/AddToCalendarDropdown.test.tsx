import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="chevron-down" />,
  CalendarPlus: () => <span data-testid="calendar-plus" />,
}));
vi.mock("@/shared/ui/icons/GoogleIcon", () => ({ GoogleIcon: () => <span data-testid="google-icon" /> }));
vi.mock("@/shared/ui/icons/OutlookIcon", () => ({ OutlookIcon: () => <span data-testid="outlook-icon" /> }));
vi.mock("@/shared/ui/icons/AppleIcon", () => ({ AppleIcon: () => <span data-testid="apple-icon" /> }));
vi.mock("@/shared/ui/icons/MicrosoftIcon", () => ({ MicrosoftIcon: () => <span data-testid="microsoft-icon" /> }));

import { AddToCalendarDropdown } from "./AddToCalendarDropdown";
import type { Meeting } from "../types";

const baseMeeting: Meeting = {
  id: 1,
  teamId: 10,
  organiserId: 5,
  title: "Reggie Team Standup",
  date: "2026-03-25T14:00:00Z",
  subject: null,
  location: null,
  videoCallLink: null,
  agenda: null,
  participants: [],
  attendance: [],
  comments: [],
  minutes: null,
  team: { projectId: 1, teamName: "Reggie", allocations: [] },
} as unknown as Meeting;

const meetingWithDetails: Meeting = {
  ...baseMeeting,
  location: "Bush House 4.02",
  agenda: "Review project progress",
  videoCallLink: "https://meet.example.com/abc",
} as unknown as Meeting;

describe("AddToCalendarDropdown", () => {
  it("renders the trigger button", () => {
    render(<AddToCalendarDropdown meeting={baseMeeting} />);
    expect(screen.getByRole("button", { name: /add to calendar/i })).toBeInTheDocument();
  });

  it("does not show dropdown by default", () => {
    render(<AddToCalendarDropdown meeting={baseMeeting} />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens dropdown on click", () => {
    render(<AddToCalendarDropdown meeting={baseMeeting} />);
    fireEvent.click(screen.getByRole("button", { name: /add to calendar/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("closes dropdown on second click", () => {
    render(<AddToCalendarDropdown meeting={baseMeeting} />);
    const trigger = screen.getByRole("button", { name: /add to calendar/i });
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows all four calendar options", () => {
    render(<AddToCalendarDropdown meeting={baseMeeting} />);
    fireEvent.click(screen.getByRole("button", { name: /add to calendar/i }));

    expect(screen.getByText("Google Calendar")).toBeInTheDocument();
    expect(screen.getByText("Outlook")).toBeInTheDocument();
    expect(screen.getByText("Microsoft 365")).toBeInTheDocument();
    expect(screen.getByText("Apple / iCal")).toBeInTheDocument();
  });

  it("sets aria-expanded on trigger", () => {
    render(<AddToCalendarDropdown meeting={baseMeeting} />);
    const trigger = screen.getByRole("button", { name: /add to calendar/i });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("closes dropdown when clicking outside", () => {
    render(<AddToCalendarDropdown meeting={baseMeeting} />);
    fireEvent.click(screen.getByRole("button", { name: /add to calendar/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("builds google calendar url with title and dates", () => {
    render(<AddToCalendarDropdown meeting={baseMeeting} />);
    fireEvent.click(screen.getByRole("button", { name: /add to calendar/i }));

    const link = screen.getByText("Google Calendar").closest("a");
    expect(link?.href).toContain("calendar.google.com/calendar/render");
    expect(link?.href).toContain("text=Reggie+Team+Standup");
    expect(link?.href).toContain("20260325T140000Z");
    expect(link?.href).toContain("20260325T150000Z");
  });

  it("includes location in google calendar url when present", () => {
    render(<AddToCalendarDropdown meeting={meetingWithDetails} />);
    fireEvent.click(screen.getByRole("button", { name: /add to calendar/i }));

    const link = screen.getByText("Google Calendar").closest("a");
    expect(link?.href).toContain("location=Bush+House+4.02");
  });

  it("includes agenda and video call in google calendar details", () => {
    render(<AddToCalendarDropdown meeting={meetingWithDetails} />);
    fireEvent.click(screen.getByRole("button", { name: /add to calendar/i }));

    const link = screen.getByText("Google Calendar").closest("a");
    const href = link?.href ?? "";
    expect(href).toContain("details=");
    expect(href).toContain("Review+project+progress");
    expect(href).toContain("Video+call");
  });

  it("builds outlook url with correct base", () => {
    render(<AddToCalendarDropdown meeting={baseMeeting} />);
    fireEvent.click(screen.getByRole("button", { name: /add to calendar/i }));

    const outlookLink = screen.getByText("Outlook").closest("a");
    expect(outlookLink?.href).toContain("outlook.live.com");

    const msLink = screen.getByText("Microsoft 365").closest("a");
    expect(msLink?.href).toContain("outlook.office.com");
  });

  it("includes location and details in outlook url when present", () => {
    render(<AddToCalendarDropdown meeting={meetingWithDetails} />);
    fireEvent.click(screen.getByRole("button", { name: /add to calendar/i }));

    const link = screen.getByText("Outlook").closest("a");
    expect(link?.href).toContain("location=Bush+House+4.02");
    expect(link?.href).toContain("body=");
    expect(link?.href).toContain("Review+project+progress");
  });

  it("omits location and body from outlook url when not provided", () => {
    render(<AddToCalendarDropdown meeting={baseMeeting} />);
    fireEvent.click(screen.getByRole("button", { name: /add to calendar/i }));

    const link = screen.getByText("Outlook").closest("a");
    expect(link?.href).not.toContain("location=");
    expect(link?.href).not.toContain("body=");
  });

  it("downloads ics file when apple option is clicked", () => {
    const createObjectURLMock = vi.fn().mockReturnValue("blob:test");
    const revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    render(<AddToCalendarDropdown meeting={baseMeeting} />);
    fireEvent.click(screen.getByRole("button", { name: /add to calendar/i }));

    const clickMock = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const spy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        return { href: "", download: "", click: clickMock } as any;
      }
      return originalCreateElement(tag);
    });

    fireEvent.click(screen.getByText("Apple / iCal"));

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalled();

    spy.mockRestore();
  });

  it("includes location and description in ics when meeting has details", () => {
    let blobContent = "";
    const createObjectURLMock = vi.fn().mockReturnValue("blob:test");
    const revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;
    const originalBlob = global.Blob;
    global.Blob = class extends originalBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options);
        blobContent = parts.join("");
      }
    } as any;

    render(<AddToCalendarDropdown meeting={meetingWithDetails} />);
    fireEvent.click(screen.getByRole("button", { name: /add to calendar/i }));

    const clickMock = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const spy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        return { href: "", download: "", click: clickMock } as any;
      }
      return originalCreateElement(tag);
    });

    fireEvent.click(screen.getByText("Apple / iCal"));

    expect(blobContent).toContain("LOCATION:Bush House 4.02");
    expect(blobContent).toContain("DESCRIPTION:Review project progress");
    expect(blobContent).toContain("URL:https://meet.example.com/abc");

    spy.mockRestore();
    global.Blob = originalBlob;
  });

  it("renders compact trigger with icon only", () => {
    render(<AddToCalendarDropdown meeting={baseMeeting} compact />);

    expect(screen.getByRole("button", { name: "Add to calendar" })).toBeInTheDocument();
    expect(screen.queryByText("Add to calendar")).not.toBeInTheDocument();
    expect(screen.getByTestId("calendar-plus")).toBeInTheDocument();
  });

  it("opens dropdown in compact mode with portal", () => {
    render(<AddToCalendarDropdown meeting={baseMeeting} compact />);
    fireEvent.click(screen.getByRole("button", { name: "Add to calendar" }));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("closes dropdown when a calendar link is clicked", () => {
    render(<AddToCalendarDropdown meeting={baseMeeting} />);
    fireEvent.click(screen.getByRole("button", { name: /add to calendar/i }));
    fireEvent.click(screen.getByText("Google Calendar"));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes dropdown when Outlook and Microsoft links are clicked", () => {
    render(<AddToCalendarDropdown meeting={baseMeeting} />);

    fireEvent.click(screen.getByRole("button", { name: /add to calendar/i }));
    fireEvent.click(screen.getByText("Outlook"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /add to calendar/i }));
    fireEvent.click(screen.getByText("Microsoft 365"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
