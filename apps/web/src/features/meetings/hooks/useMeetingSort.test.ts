import { renderHook, act } from "@testing-library/react";
import { useMeetingSort } from "./useMeetingSort";
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
    date: "2026-03-01T10:00:00Z",
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

const meetingA = buildMeeting({ id: 1, title: "Alpha", date: "2026-03-01T10:00:00Z", organiser: { id: 1, firstName: "Alice", lastName: "Smith" }, location: "Room A" });
const meetingB = buildMeeting({ id: 2, title: "Beta", date: "2026-03-02T10:00:00Z", organiser: { id: 2, firstName: "Bob", lastName: "Jones" }, location: "Room B" });
const meetingC = buildMeeting({ id: 3, title: "Charlie", date: "2026-03-03T10:00:00Z", organiser: { id: 3, firstName: "Carol", lastName: "White" }, location: "Room C" });

describe("useMeetingSort", () => {
  it("defaults to sorting by date ascending", () => {
    const { result } = renderHook(() => useMeetingSort([meetingC, meetingA, meetingB], false));

    expect(result.current.sorted.map((m) => m.id)).toEqual([1, 2, 3]);
    expect(result.current.sortConfig).toEqual({ column: 1, direction: "asc" });
  });

  it("defaults to sorting by date descending when showMinutesWriter is true", () => {
    const { result } = renderHook(() => useMeetingSort([meetingA, meetingB, meetingC], true));

    expect(result.current.sorted.map((m) => m.id)).toEqual([3, 2, 1]);
    expect(result.current.sortConfig).toEqual({ column: 1, direction: "desc" });
  });

  it("sorts by title when column 0 is selected", () => {
    const { result } = renderHook(() => useMeetingSort([meetingC, meetingA, meetingB], false));

    act(() => {
      result.current.handleSort(0);
    });

    expect(result.current.sorted.map((m) => m.title)).toEqual(["Alpha", "Beta", "Charlie"]);
  });

  it("sorts by organiser name when column 2 is selected", () => {
    const { result } = renderHook(() => useMeetingSort([meetingC, meetingA, meetingB], false));

    act(() => {
      result.current.handleSort(2);
    });

    expect(result.current.sorted.map((m) => m.organiser.firstName)).toEqual(["Alice", "Bob", "Carol"]);
  });

  it("sorts by location when column 3 is selected and showMinutesWriter is false", () => {
    const { result } = renderHook(() => useMeetingSort([meetingC, meetingA, meetingB], false));

    act(() => {
      result.current.handleSort(3);
    });

    expect(result.current.sorted.map((m) => m.location)).toEqual(["Room A", "Room B", "Room C"]);
  });

  it("sorts by minutes writer when column 3 is selected and showMinutesWriter is true", () => {
    const withMinutes = buildMeeting({ id: 4, title: "Delta", minutes: { id: 1, meetingId: 4, writerId: 1, writer: { id: 1, firstName: "Zara", lastName: "Lee" }, content: "", createdAt: "", updatedAt: "" } });
    const withoutMinutes = buildMeeting({ id: 5, title: "Echo" });

    const { result } = renderHook(() => useMeetingSort([withMinutes, withoutMinutes], true));

    act(() => {
      result.current.handleSort(3);
    });

    expect(result.current.sorted.map((m) => m.id)).toEqual([5, 4]);
  });

  it("sorts by participant count when column 4 is selected and showMinutesWriter is false", () => {
    const few = buildMeeting({ id: 1, participants: [{ id: 1, meetingId: 1, userId: 1, user: { id: 1, firstName: "A", lastName: "B" } }] });
    const many = buildMeeting({ id: 2, participants: [{ id: 2, meetingId: 2, userId: 2, user: { id: 2, firstName: "C", lastName: "D" } }, { id: 3, meetingId: 2, userId: 3, user: { id: 3, firstName: "E", lastName: "F" } }] });

    const { result } = renderHook(() => useMeetingSort([many, few], false));

    act(() => {
      result.current.handleSort(4);
    });

    expect(result.current.sorted.map((m) => m.id)).toEqual([1, 2]);
  });

  it("toggles direction when the same column is selected twice", () => {
    const { result } = renderHook(() => useMeetingSort([meetingA, meetingB], false));

    act(() => {
      result.current.handleSort(0);
    });
    expect(result.current.sortConfig.direction).toBe("asc");

    act(() => {
      result.current.handleSort(0);
    });
    expect(result.current.sortConfig.direction).toBe("desc");
  });

  it("ignores sort on column 5", () => {
    const { result } = renderHook(() => useMeetingSort([meetingA], false));

    act(() => {
      result.current.handleSort(5);
    });

    expect(result.current.sortConfig).toEqual({ column: 1, direction: "asc" });
  });

  it("ignores sort on column 4 when showMinutesWriter is true", () => {
    const { result } = renderHook(() => useMeetingSort([meetingA], true));

    act(() => {
      result.current.handleSort(4);
    });

    expect(result.current.sortConfig).toEqual({ column: 1, direction: "desc" });
  });
});
