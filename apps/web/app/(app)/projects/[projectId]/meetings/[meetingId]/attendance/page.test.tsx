import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MeetingAttendancePage from "./page";

vi.mock("@/features/meetings/components/MeetingAttendanceContent", () => ({
  MeetingAttendanceContent: ({ meetingId, projectId }: { meetingId: number; projectId: number }) => (
    <div data-testid="meeting-attendance-content" data-meeting-id={meetingId} data-project-id={projectId} />
  ),
}));

describe("MeetingAttendancePage", () => {
  it("renders attendance content with numeric props", async () => {
    const page = await MeetingAttendancePage({ params: Promise.resolve({ projectId: "5", meetingId: "10" }) });
    render(page);

    const content = screen.getByTestId("meeting-attendance-content");
    expect(content).toHaveAttribute("data-meeting-id", "10");
    expect(content).toHaveAttribute("data-project-id", "5");
  });
});
