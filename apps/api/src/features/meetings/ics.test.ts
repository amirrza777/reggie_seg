import { describe, expect, it } from "vitest";
import { buildIcs, escapeIcsText } from "./ics.js";

describe("escapeIcsText", () => {
  it("escapes backslashes", () => {
    expect(escapeIcsText("back\\slash")).toBe("back\\\\slash");
  });

  it("escapes semicolons", () => {
    expect(escapeIcsText("a;b;c")).toBe("a\\;b\\;c");
  });

  it("escapes commas", () => {
    expect(escapeIcsText("a,b,c")).toBe("a\\,b\\,c");
  });

  it("escapes all special characters together", () => {
    expect(escapeIcsText("Review; Planning, Notes")).toBe("Review\\; Planning\\, Notes");
  });

  it("leaves plain text unchanged", () => {
    expect(escapeIcsText("Team Meeting")).toBe("Team Meeting");
  });
});

describe("buildIcs", () => {
  const baseDate = new Date("2026-05-01T14:00:00Z");

  it("produces valid VCALENDAR structure", () => {
    const result = buildIcs({ title: "Standup", date: baseDate });
    expect(result).toContain("BEGIN:VCALENDAR");
    expect(result).toContain("END:VCALENDAR");
    expect(result).toContain("BEGIN:VEVENT");
    expect(result).toContain("END:VEVENT");
  });

  it("formats DTSTART and DTEND correctly", () => {
    const result = buildIcs({ title: "Standup", date: baseDate });
    expect(result).toContain("DTSTART:20260501T140000Z");
    expect(result).toContain("DTEND:20260501T150000Z");
  });

  it("includes SUMMARY with the meeting title", () => {
    const result = buildIcs({ title: "Sprint Review", date: baseDate });
    expect(result).toContain("SUMMARY:Sprint Review");
  });

  it("escapes special characters in title", () => {
    const result = buildIcs({ title: "Review; Planning, Notes", date: baseDate });
    expect(result).toContain("SUMMARY:Review\\; Planning\\, Notes");
  });

  it("includes LOCATION when provided", () => {
    const result = buildIcs({ title: "Meeting", date: baseDate, location: "Room 2.01" });
    expect(result).toContain("LOCATION:Room 2.01");
  });

  it("omits LOCATION when not provided", () => {
    const result = buildIcs({ title: "Meeting", date: baseDate });
    expect(result).not.toContain("LOCATION:");
  });

  it("includes DESCRIPTION with agenda when provided", () => {
    const result = buildIcs({ title: "Meeting", date: baseDate, agenda: "Item 1\nItem 2" });
    expect(result).toContain("DESCRIPTION:");
    expect(result).toContain("Item 1");
  });

  it("includes DESCRIPTION with video call link when provided", () => {
    const result = buildIcs({ title: "Meeting", date: baseDate, videoCallLink: "https://meet.example.com/abc" });
    expect(result).toContain("DESCRIPTION:");
    expect(result).toContain("Video call: https://meet.example.com/abc");
  });

  it("combines agenda and video call link in DESCRIPTION", () => {
    const result = buildIcs({
      title: "Meeting",
      date: baseDate,
      agenda: "Discuss roadmap",
      videoCallLink: "https://meet.example.com/abc",
    });
    expect(result).toContain("Discuss roadmap");
    expect(result).toContain("Video call: https://meet.example.com/abc");
  });

  it("omits DESCRIPTION when neither agenda nor video call link is provided", () => {
    const result = buildIcs({ title: "Meeting", date: baseDate });
    expect(result).not.toContain("DESCRIPTION:");
  });

  it("uses CRLF line endings", () => {
    const result = buildIcs({ title: "Meeting", date: baseDate });
    expect(result).toContain("\r\n");
  });
});
