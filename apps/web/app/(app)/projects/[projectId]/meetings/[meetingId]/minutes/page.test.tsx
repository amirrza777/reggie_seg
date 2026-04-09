import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MeetingMinutesPage from "./page";

vi.mock("@/features/meetings/components/MeetingMinutesContent", () => ({
  MeetingMinutesContent: ({ meetingId, projectId }: { meetingId: number; projectId: number }) => (
    <div data-testid="meeting-minutes-content" data-meeting-id={meetingId} data-project-id={projectId} />
  ),
}));

describe("MeetingMinutesPage", () => {
  it("renders minutes content with numeric props", async () => {
    const page = await MeetingMinutesPage({ params: Promise.resolve({ projectId: "5", meetingId: "10" }) });
    render(page);

    const content = screen.getByTestId("meeting-minutes-content");
    expect(content).toHaveAttribute("data-meeting-id", "10");
    expect(content).toHaveAttribute("data-project-id", "5");
  });
});
