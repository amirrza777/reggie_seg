import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const getMeetingMock = vi.fn();
const getMeetingSettingsMock = vi.fn();

vi.mock("../../api/client", () => ({
  getMeeting: (...args: unknown[]) => getMeetingMock(...args),
  getMeetingSettings: (...args: unknown[]) => getMeetingSettingsMock(...args),
}));

vi.mock("./MeetingDetail", () => ({
  MeetingDetail: (props: any) => (
    <div data-testid="meeting-detail">
      {props.meeting.title} | projectId={props.projectId}
    </div>
  ),
}));

import { MeetingDetailContent } from "./MeetingDetailContent";

const baseMeeting = {
  id: 1,
  teamId: 10,
  organiserId: 5,
  title: "Reggie Team Meeting",
  date: "2026-03-18T14:00:00Z",
  team: { projectId: 1, teamName: "Reggie", allocations: [] },
};

const baseSettings = {
  minutesEditWindowDays: 7,
  attendanceEditWindowDays: 3,
  allowAnyoneToEditMeetings: false,
  allowAnyoneToRecordAttendance: false,
  allowAnyoneToWriteMinutes: false,
};

beforeEach(() => {
  getMeetingMock.mockReset();
  getMeetingSettingsMock.mockReset();
  getMeetingMock.mockResolvedValue(baseMeeting);
  getMeetingSettingsMock.mockResolvedValue(baseSettings);
});

describe("MeetingDetailContent", () => {
  it("renders nothing while loading", () => {
    getMeetingMock.mockReturnValue(new Promise(() => {}));
    getMeetingSettingsMock.mockReturnValue(new Promise(() => {}));

    const { container } = render(<MeetingDetailContent meetingId={1} projectId={1} />);

    expect(container.innerHTML).toBe("");
  });

  it("fetches meeting and settings on mount", async () => {
    render(<MeetingDetailContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(getMeetingMock).toHaveBeenCalledWith(1);
      expect(getMeetingSettingsMock).toHaveBeenCalledWith(1);
    });
  });

  it("renders MeetingDetail with fetched data", async () => {
    render(<MeetingDetailContent meetingId={1} projectId={1} />);

    await waitFor(() => {
      expect(screen.getByTestId("meeting-detail")).toBeInTheDocument();
    });

    expect(screen.getByText(/Reggie Team Meeting/)).toBeInTheDocument();
    expect(screen.getByText(/projectId=1/)).toBeInTheDocument();
  });
});
