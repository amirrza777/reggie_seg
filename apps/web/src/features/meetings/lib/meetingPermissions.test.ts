import { getMeetingPermissions } from "./meetingPermissions";
import { vi } from "vitest";
import type { Meeting, MeetingPermissions } from "../types";

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
    date: "2026-03-01T10:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    organiser: { id: 100, firstName: "Alice", lastName: "Smith" },
    team: { enterpriseId: "ent-1", allocations: [{ user: { id: 200, firstName: "Bob", lastName: "Jones" } }] },
    participants: [],
    attendances: [],
    minutes: null,
    comments: [],
    ...overrides,
  };
}

function buildPermissions(overrides: Partial<MeetingPermissions> = {}): MeetingPermissions {
  return {
    minutesEditWindowDays: 7,
    attendanceEditWindowDays: 7,
    allowAnyoneToEditMeetings: false,
    allowAnyoneToRecordAttendance: false,
    allowAnyoneToWriteMinutes: false,
    ...overrides,
  };
}

describe("getMeetingPermissions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-03T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("grants all edit permissions to the organiser", () => {
    const result = getMeetingPermissions(buildMeeting(), buildPermissions(), 100, true);

    expect(result.canEditMeeting).toBe(true);
    expect(result.canRecordAttendance).toBe(true);
    expect(result.canWriteMinutes).toBe(true);
  });

  it("denies all edit permissions when canEdit is false", () => {
    const result = getMeetingPermissions(buildMeeting(), buildPermissions(), 100, false);

    expect(result.canEditMeeting).toBe(false);
    expect(result.canRecordAttendance).toBe(false);
    expect(result.canWriteMinutes).toBe(false);
  });

  it("denies edit and attendance to a non-organiser non-member", () => {
    const result = getMeetingPermissions(buildMeeting(), buildPermissions(), 999, true);

    expect(result.canEditMeeting).toBe(false);
    expect(result.canRecordAttendance).toBe(false);
  });

  it("allows minutes when no minutes exist yet", () => {
    const result = getMeetingPermissions(buildMeeting(), buildPermissions(), 999, true);

    expect(result.canWriteMinutes).toBe(true);
  });

  it("grants edit to a team member when allowAnyoneToEditMeetings is true", () => {
    const result = getMeetingPermissions(buildMeeting(), buildPermissions({ allowAnyoneToEditMeetings: true }), 200, true);

    expect(result.canEditMeeting).toBe(true);
  });

  it("denies edit to a non-member even with allowAnyoneToEditMeetings", () => {
    const result = getMeetingPermissions(buildMeeting(), buildPermissions({ allowAnyoneToEditMeetings: true }), 999, true);

    expect(result.canEditMeeting).toBe(false);
  });

  it("grants attendance recording to a member when allowed", () => {
    const result = getMeetingPermissions(buildMeeting(), buildPermissions({ allowAnyoneToRecordAttendance: true }), 200, true);

    expect(result.canRecordAttendance).toBe(true);
  });

  it("grants minutes writing to a member when allowed", () => {
    const result = getMeetingPermissions(buildMeeting(), buildPermissions({ allowAnyoneToWriteMinutes: true }), 200, true);

    expect(result.canWriteMinutes).toBe(true);
  });

  it("grants minutes writing to the original writer", () => {
    const meeting = buildMeeting({
      minutes: {
        id: 1, meetingId: 1, writerId: 200,
        writer: { id: 200, firstName: "Bob", lastName: "Jones" },
        content: "notes", createdAt: "2026-03-01T12:00:00Z", updatedAt: "2026-03-01T12:00:00Z",
      },
    });

    expect(getMeetingPermissions(meeting, buildPermissions(), 200, true).canWriteMinutes).toBe(true);
  });

  it("denies minutes writing to someone else when minutes exist", () => {
    const meeting = buildMeeting({
      minutes: {
        id: 1, meetingId: 1, writerId: 300,
        writer: { id: 300, firstName: "Carol", lastName: "White" },
        content: "notes", createdAt: "2026-03-01T12:00:00Z", updatedAt: "2026-03-01T12:00:00Z",
      },
    });

    expect(getMeetingPermissions(meeting, buildPermissions(), 999, true).canWriteMinutes).toBe(false);
  });

  it("returns minutesWindowOpen true when within the window", () => {
    const result = getMeetingPermissions(buildMeeting(), buildPermissions({ minutesEditWindowDays: 7 }), 100, true);

    expect(result.minutesWindowOpen).toBe(true);
  });

  it("returns minutesWindowOpen false when outside the window", () => {
    const result = getMeetingPermissions(buildMeeting({ date: "2026-02-01T10:00:00Z" }), buildPermissions({ minutesEditWindowDays: 7 }), 100, true);

    expect(result.minutesWindowOpen).toBe(false);
  });

  it("returns attendanceWindowOpen false when windowDays is 0", () => {
    const result = getMeetingPermissions(buildMeeting(), buildPermissions({ attendanceEditWindowDays: 0 }), 100, true);

    expect(result.attendanceWindowOpen).toBe(false);
  });

  it("returns both windows false when permissions is null", () => {
    const result = getMeetingPermissions(buildMeeting(), null, 100, true);

    expect(result.minutesWindowOpen).toBe(false);
    expect(result.attendanceWindowOpen).toBe(false);
  });

  it("handles missing team allocations gracefully", () => {
    const meeting = buildMeeting({ team: undefined as any });
    const result = getMeetingPermissions(meeting, buildPermissions({ allowAnyoneToEditMeetings: true }), 200, true);

    expect(result.canEditMeeting).toBe(false);
  });

  it("grants minutes to a member via toggle even when minutes exist from another writer", () => {
    const meeting = buildMeeting({
      minutes: {
        id: 1, meetingId: 1, writerId: 300,
        writer: { id: 300, firstName: "Carol", lastName: "White" },
        content: "notes", createdAt: "2026-03-01T12:00:00Z", updatedAt: "2026-03-01T12:00:00Z",
      },
    });

    const result = getMeetingPermissions(meeting, buildPermissions({ allowAnyoneToWriteMinutes: true }), 200, true);
    expect(result.canWriteMinutes).toBe(true);
  });

  it("denies edit and attendance when userId is null", () => {
    const result = getMeetingPermissions(buildMeeting(), buildPermissions(), null, true);

    expect(result.canEditMeeting).toBe(false);
    expect(result.canRecordAttendance).toBe(false);
  });
});
