import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MeetingEditPage from "./page";

vi.mock("@/features/meetings/components/MeetingEditContent", () => ({
  MeetingEditContent: ({ meetingId, projectId }: { meetingId: number; projectId: number }) => (
    <div data-testid="meeting-edit-content" data-meeting-id={meetingId} data-project-id={projectId} />
  ),
}));

describe("MeetingEditPage", () => {
  it("renders edit content with numeric props", async () => {
    const page = await MeetingEditPage({ params: Promise.resolve({ projectId: "5", meetingId: "10" }) });
    render(page);

    const content = screen.getByTestId("meeting-edit-content");
    expect(content).toHaveAttribute("data-meeting-id", "10");
    expect(content).toHaveAttribute("data-project-id", "5");
  });
});
