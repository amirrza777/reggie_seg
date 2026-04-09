import { buildIcs } from "./ics";

describe("buildIcs", () => {
  const baseMeeting = {
    title: "Team Meeting",
    date: new Date("2026-03-18T14:00:00Z"),
  };

  it("contains required calendar fields", () => {
    const ics = buildIcs(baseMeeting);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//Reggie//Reggie//EN");
  });

  it("formats start and end times correctly", () => {
    const ics = buildIcs(baseMeeting);
    expect(ics).toContain("DTSTART:20260318T140000Z");
    expect(ics).toContain("DTEND:20260318T150000Z");
  });

  it("includes the meeting title", () => {
    const ics = buildIcs(baseMeeting);
    expect(ics).toContain("SUMMARY:Team Meeting");
  });

  it("includes location when provided", () => {
    const ics = buildIcs({ ...baseMeeting, location: "Bush House 4.02" });
    expect(ics).toContain("LOCATION:Bush House 4.02");
  });

  it("excludes location when not provided", () => {
    const ics = buildIcs(baseMeeting);
    expect(ics).not.toContain("LOCATION:");
  });

  it("includes agenda in description", () => {
    const ics = buildIcs({ ...baseMeeting, agenda: "Review progress" });
    expect(ics).toContain("DESCRIPTION:Review progress");
  });

  it("includes video call link in description", () => {
    const ics = buildIcs({ ...baseMeeting, videoCallLink: "https://meet.example.com" });
    expect(ics).toContain("DESCRIPTION:Video call: https://meet.example.com");
  });

  it("combines agenda and video call link in description", () => {
    const ics = buildIcs({
      ...baseMeeting,
      agenda: "Review progress",
      videoCallLink: "https://meet.example.com",
    });
    expect(ics).toContain("DESCRIPTION:Review progress\\\\n\\\\nVideo call: https://meet.example.com");
  });

  it("excludes description when no agenda or video link", () => {
    const ics = buildIcs(baseMeeting);
    expect(ics).not.toContain("DESCRIPTION:");
  });

  it("uses CRLF line endings", () => {
    const ics = buildIcs(baseMeeting);
    expect(ics).toContain("\r\n");
  });

  it("escapes special characters in title", () => {
    const ics = buildIcs({ ...baseMeeting, title: "Team, Meeting; Review" });
    expect(ics).toContain("SUMMARY:Team\\, Meeting\\; Review");
  });
});
