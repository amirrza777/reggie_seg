import { describe, it, expect } from "vitest";
import {
  isPresent,
  getAttendanceRate,
  computeMeetingStats,
  getMemberAttendanceStats,
  getFlaggedMembers,
} from "./attendance";
import type { StaffMeeting } from "./types";

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
    date: "2026-01-01T10:00:00Z",
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-01-01T10:00:00Z",
    organiser: { id: 1, firstName: "Alice", lastName: "Smith" },
    participants: [],
    attendances: [],
    minutes: null,
    comments: [],
    ...overrides,
  };
}

function makeAttendance(userId: number, status: string, firstName = "User", lastName = `${userId}`) {
  return { id: userId, meetingId: 1, userId, status, user: { id: userId, firstName, lastName } };
}

describe("isPresent", () => {
  it("returns true for on_time and late statuses", () => {
    expect(isPresent("on_time")).toBe(true);
    expect(isPresent("late")).toBe(true);
  });

  it("returns false for absent", () => {
    expect(isPresent("absent")).toBe(false);
  });

  it("is case insensitive", () => {
    expect(isPresent("ON_TIME")).toBe(true);
    expect(isPresent("ABSENT")).toBe(false);
  });
});

describe("getAttendanceRate", () => {
  it("returns 0 for an empty attendances array", () => {
    expect(getAttendanceRate([])).toBe(0);
  });

  it("returns the fraction of present attendances", () => {
    const attendances = [{ status: "on_time" }, { status: "late" }, { status: "absent" }];
    expect(getAttendanceRate(attendances)).toBeCloseTo(2 / 3);
  });
});

describe("computeMeetingStats", () => {
  it("returns zeros for an empty meetings array", () => {
    expect(computeMeetingStats([])).toEqual({ totalMeetings: 0, avgAttendanceRate: 0, onTimeRate: 0 });
  });

  it("returns zero rates when no attendance has been recorded", () => {
    const result = computeMeetingStats([makeMeeting({ attendances: [] })]);
    expect(result).toEqual({ totalMeetings: 1, avgAttendanceRate: 0, onTimeRate: 0 });
  });

  it("returns zero on-time rate when all attendees were absent", () => {
    const m = makeMeeting({ attendances: [makeAttendance(1, "absent"), makeAttendance(2, "absent")] });
    const result = computeMeetingStats([m]);
    expect(result.avgAttendanceRate).toBe(0);
    expect(result.onTimeRate).toBe(0);
  });

  it("computes attendance and on-time rates across multiple meetings", () => {
    const m1 = makeMeeting({ id: 1, attendances: [makeAttendance(1, "on_time"), makeAttendance(2, "late")] });
    const m2 = makeMeeting({ id: 2, attendances: [makeAttendance(1, "absent")] });
    const result = computeMeetingStats([m1, m2]);
    expect(result.totalMeetings).toBe(2);
    expect(result.avgAttendanceRate).toBeCloseTo(2 / 3);
    expect(result.onTimeRate).toBeCloseTo(1 / 2);
  });
});

describe("getMemberAttendanceStats", () => {
  it("returns an empty array for empty meetings", () => {
    expect(getMemberAttendanceStats([])).toEqual([]);
  });

  it("computes attended and total counts for each member", () => {
    const m1 = makeMeeting({ id: 1, attendances: [makeAttendance(1, "on_time", "Alice", "Smith")] });
    const m2 = makeMeeting({ id: 2, attendances: [makeAttendance(1, "absent", "Alice", "Smith")] });
    const result = getMemberAttendanceStats([m1, m2]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 1, attended: 1, total: 2 });
  });

  it("records the status from the first meeting containing the member", () => {
    const m1 = makeMeeting({ id: 1, attendances: [makeAttendance(1, "on_time", "Alice", "Smith")] });
    const m2 = makeMeeting({ id: 2, attendances: [makeAttendance(1, "absent", "Alice", "Smith")] });
    const result = getMemberAttendanceStats([m1, m2]);
    expect(result[0].lastStatus).toBe("on_time");
  });

  it("marks a member as at risk when consecutive absences reach the threshold", () => {
    const m1 = makeMeeting({ id: 1, date: "2026-01-03T10:00:00Z", attendances: [makeAttendance(1, "absent", "Alice", "Smith")] });
    const m2 = makeMeeting({ id: 2, date: "2026-01-02T10:00:00Z", attendances: [makeAttendance(1, "absent", "Alice", "Smith")] });
    const m3 = makeMeeting({ id: 3, date: "2026-01-01T10:00:00Z", attendances: [makeAttendance(1, "absent", "Alice", "Smith")] });
    const result = getMemberAttendanceStats([m1, m2, m3], 3);
    expect(result[0].atRisk).toBe(true);
  });

  it("sorts members alphabetically by name", () => {
    const m = makeMeeting({
      attendances: [
        makeAttendance(2, "on_time", "Zara", "Jones"),
        makeAttendance(1, "on_time", "Alice", "Smith"),
      ],
    });
    const result = getMemberAttendanceStats([m]);
    expect(result[0].firstName).toBe("Alice");
    expect(result[1].firstName).toBe("Zara");
  });
});

describe("getFlaggedMembers", () => {
  it("returns an empty array for empty meetings", () => {
    expect(getFlaggedMembers([])).toEqual([]);
  });

  it("returns an empty array when no member reaches the threshold", () => {
    const m = makeMeeting({ attendances: [makeAttendance(1, "on_time", "Alice", "Smith")] });
    expect(getFlaggedMembers([m], 3)).toEqual([]);
  });

  it("flags members who reach the consecutive absence threshold", () => {
    const m1 = makeMeeting({ id: 1, date: "2026-01-03T10:00:00Z", attendances: [makeAttendance(1, "absent", "Alice", "Smith")] });
    const m2 = makeMeeting({ id: 2, date: "2026-01-02T10:00:00Z", attendances: [makeAttendance(1, "absent", "Alice", "Smith")] });
    const m3 = makeMeeting({ id: 3, date: "2026-01-01T10:00:00Z", attendances: [makeAttendance(1, "absent", "Alice", "Smith")] });
    const result = getFlaggedMembers([m1, m2, m3], 3);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ firstName: "Alice", consecutiveAbsences: 3 });
  });

  it("sorts flagged members by consecutive absences descending", () => {
    const m1 = makeMeeting({ id: 1, date: "2026-01-04T10:00:00Z", attendances: [makeAttendance(1, "absent", "Alice", "A"), makeAttendance(2, "absent", "Zara", "Z")] });
    const m2 = makeMeeting({ id: 2, date: "2026-01-03T10:00:00Z", attendances: [makeAttendance(1, "absent", "Alice", "A"), makeAttendance(2, "absent", "Zara", "Z")] });
    const m3 = makeMeeting({ id: 3, date: "2026-01-02T10:00:00Z", attendances: [makeAttendance(1, "absent", "Alice", "A")] });
    const result = getFlaggedMembers([m1, m2, m3], 2);
    expect(result[0].firstName).toBe("Alice");
    expect(result[1].firstName).toBe("Zara");
  });

  it("skips future meetings when counting consecutive absences", () => {
    const future = makeMeeting({ id: 1, date: "2099-01-01T10:00:00Z", attendances: [makeAttendance(1, "absent", "Alice", "Smith")] });
    const past = makeMeeting({ id: 2, date: "2026-01-01T10:00:00Z", attendances: [makeAttendance(1, "absent", "Alice", "Smith")] });
    const result = getFlaggedMembers([future, past], 2);
    expect(result).toHaveLength(0);
  });

  it("stops counting when an attendance record is missing for a meeting", () => {
    const m1 = makeMeeting({ id: 1, date: "2026-01-03T10:00:00Z", attendances: [makeAttendance(1, "absent", "Alice", "Smith")] });
    const m2 = makeMeeting({ id: 2, date: "2026-01-02T10:00:00Z", attendances: [] });
    const m3 = makeMeeting({ id: 3, date: "2026-01-01T10:00:00Z", attendances: [makeAttendance(1, "absent", "Alice", "Smith")] });
    const result = getFlaggedMembers([m1, m2, m3], 2);
    expect(result).toHaveLength(0);
  });

  it("stops counting when a non-absent status is found", () => {
    const m1 = makeMeeting({ id: 1, date: "2026-01-02T10:00:00Z", attendances: [makeAttendance(1, "absent", "Alice", "Smith")] });
    const m2 = makeMeeting({ id: 2, date: "2026-01-01T10:00:00Z", attendances: [makeAttendance(1, "on_time", "Alice", "Smith")] });
    const result = getFlaggedMembers([m1, m2], 2);
    expect(result).toHaveLength(0);
  });
});
