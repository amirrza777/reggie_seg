import { renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../api/client", () => ({
  getMeeting: vi.fn(),
  getMeetingSettings: vi.fn(),
}));

import { getMeeting, getMeetingSettings } from "../api/client";
import { useMeetingWithSettings } from "./useMeetingWithSettings";

const getMeetingMock = getMeeting as ReturnType<typeof vi.fn>;
const getMeetingSettingsMock = getMeetingSettings as ReturnType<typeof vi.fn>;

const fakeMeeting = { id: 1, title: "Team Meeting" };
const fakeSettings = {
  absenceThreshold: 3,
  minutesEditWindowDays: 7,
  attendanceEditWindowDays: 7,
  allowAnyoneToEditMeetings: false,
  allowAnyoneToRecordAttendance: false,
  allowAnyoneToWriteMinutes: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useMeetingWithSettings", () => {
  it("returns null meeting and settings before fetch resolves", () => {
    getMeetingMock.mockReturnValue(new Promise(() => {}));
    getMeetingSettingsMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useMeetingWithSettings(1));

    expect(result.current.meeting).toBeNull();
    expect(result.current.settings).toBeNull();
  });

  it("returns meeting and settings after fetch resolves", async () => {
    getMeetingMock.mockResolvedValue(fakeMeeting);
    getMeetingSettingsMock.mockResolvedValue(fakeSettings);

    const { result } = renderHook(() => useMeetingWithSettings(1));

    await waitFor(() => {
      expect(result.current.meeting).toEqual(fakeMeeting);
      expect(result.current.settings).toEqual(fakeSettings);
    });
  });

  it("fetches with the correct meeting id", async () => {
    getMeetingMock.mockResolvedValue(fakeMeeting);
    getMeetingSettingsMock.mockResolvedValue(fakeSettings);

    renderHook(() => useMeetingWithSettings(42));

    await waitFor(() => {
      expect(getMeetingMock).toHaveBeenCalledWith(42);
      expect(getMeetingSettingsMock).toHaveBeenCalledWith(42);
    });
  });

  it("refetches when meeting id changes", async () => {
    getMeetingMock.mockResolvedValue(fakeMeeting);
    getMeetingSettingsMock.mockResolvedValue(fakeSettings);

    const { rerender } = renderHook(
      ({ id }) => useMeetingWithSettings(id),
      { initialProps: { id: 1 } }
    );

    await waitFor(() => {
      expect(getMeetingMock).toHaveBeenCalledWith(1);
    });

    rerender({ id: 2 });

    await waitFor(() => {
      expect(getMeetingMock).toHaveBeenCalledWith(2);
    });
  });
});
