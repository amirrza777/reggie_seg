import { buildGoogleUrl, buildOutlookUrl, downloadIcs } from "./calendarLinks";
import { vi } from "vitest";
import type { Meeting } from "../types";

function buildMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: 1,
    teamId: 10,
    organiserId: 100,
    title: "Standup",
    subject: null,
    location: null,
    videoCallLink: null,
    agenda: null,
    date: "2026-03-18T14:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    organiser: { id: 100, firstName: "Alice", lastName: "Smith" },
    team: { enterpriseId: "ent-1", allocations: [] },
    participants: [],
    attendances: [],
    minutes: null,
    comments: [],
    ...overrides,
  };
}

describe("buildGoogleUrl", () => {
  it("returns a Google Calendar URL with title and dates", () => {
    const url = buildGoogleUrl(buildMeeting());
    expect(url).toContain("calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("text=Standup");
    expect(url).toContain("20260318T140000Z");
    expect(url).toContain("20260318T150000Z");
  });

  it("includes location when provided", () => {
    const url = buildGoogleUrl(buildMeeting({ location: "Room 3.01" }));
    expect(url).toContain("location=Room");
  });

  it("excludes location when not provided", () => {
    const url = buildGoogleUrl(buildMeeting());
    expect(url).not.toContain("location=");
  });

  it("includes agenda in details", () => {
    const url = buildGoogleUrl(buildMeeting({ agenda: "Review sprint" }));
    expect(url).toContain("details=Review");
  });

  it("includes video call link in details", () => {
    const url = buildGoogleUrl(buildMeeting({ videoCallLink: "https://meet.example.com" }));
    expect(url).toContain("details=Video");
  });

  it("excludes details when no agenda or video link", () => {
    const url = buildGoogleUrl(buildMeeting());
    expect(url).not.toContain("details=");
  });
});

describe("buildOutlookUrl", () => {
  const baseUrl = "https://outlook.live.com/calendar/0/deeplink/compose";

  it("returns an Outlook URL with subject and dates", () => {
    const url = buildOutlookUrl(buildMeeting(), baseUrl);
    expect(url).toContain(baseUrl);
    expect(url).toContain("subject=Standup");
    expect(url).toContain("startdt=2026-03-18T14%3A00%3A00");
    expect(url).toContain("enddt=2026-03-18T15%3A00%3A00");
  });

  it("includes location when provided", () => {
    const url = buildOutlookUrl(buildMeeting({ location: "Room A" }), baseUrl);
    expect(url).toContain("location=Room");
  });

  it("excludes location when not provided", () => {
    const url = buildOutlookUrl(buildMeeting(), baseUrl);
    expect(url).not.toContain("location=");
  });

  it("includes agenda in body", () => {
    const url = buildOutlookUrl(buildMeeting({ agenda: "Review sprint" }), baseUrl);
    expect(url).toContain("body=Review");
  });

  it("includes both agenda and video link in body", () => {
    const url = buildOutlookUrl(buildMeeting({ agenda: "Notes", videoCallLink: "https://meet.example.com" }), baseUrl);
    expect(url).toContain("body=Notes");
  });

  it("works with Microsoft 365 base URL", () => {
    const ms365 = "https://outlook.office.com/calendar/deeplink/compose";
    const url = buildOutlookUrl(buildMeeting(), ms365);
    expect(url).toContain(ms365);
  });
});

describe("downloadIcs", () => {
  it("creates and clicks a download link with .ics file", () => {
    const clickMock = vi.fn();
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue({
      set href(_: string) {},
      set download(_: string) {},
      click: clickMock,
    } as any);
    const createObjectURLMock = vi.fn(() => "blob:mock-url");
    const revokeObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;

    downloadIcs(buildMeeting());

    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(clickMock).toHaveBeenCalled();
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url");

    createElementSpy.mockRestore();
  });

  it("extracts plain text from lexical agenda in .ics file", () => {
    const clickMock = vi.fn();
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue({
      set href(_: string) {},
      set download(_: string) {},
      click: clickMock,
    } as any);
    globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    globalThis.URL.revokeObjectURL = vi.fn();

    const lexicalAgenda = JSON.stringify({
      root: { children: [{ children: [{ text: "Review sprint", type: "text" }], type: "paragraph" }], type: "root" },
    });

    downloadIcs(buildMeeting({ agenda: lexicalAgenda }));

    expect(clickMock).toHaveBeenCalled();

    createElementSpy.mockRestore();
  });
});
