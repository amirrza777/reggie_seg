import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MeetingPage from "./page";

vi.mock("@/features/meetings/components/MeetingDetailContent", () => ({
  MeetingDetailContent: ({ meetingId, projectId }: { meetingId: number; projectId: number }) => (
    <div data-testid="meeting-detail-content" data-meeting-id={meetingId} data-project-id={projectId} />
  ),
}));

describe("MeetingPage", () => {
  it("renders meeting detail content with numeric props", async () => {
    const page = await MeetingPage({ params: Promise.resolve({ projectId: "5", meetingId: "10" }) });
    render(page);

    const content = screen.getByTestId("meeting-detail-content");
    expect(content).toHaveAttribute("data-meeting-id", "10");
    expect(content).toHaveAttribute("data-project-id", "5");
  });
});
