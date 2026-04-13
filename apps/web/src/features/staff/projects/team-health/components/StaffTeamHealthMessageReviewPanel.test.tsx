"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reviewStaffTeamHealthMessage } from "@/features/projects/api/client";
import { StaffTeamHealthMessageReviewPanel } from "./StaffTeamHealthMessageReviewPanel";

vi.mock("@/features/projects/api/client", () => ({
  reviewStaffTeamHealthMessage: vi.fn(),
}));

vi.mock("@/shared/ui/rich-text/RichTextViewer", () => ({
  RichTextViewer: ({ content }: { content: string }) => <div data-testid="rich-text-viewer">{content}</div>,
}));

vi.mock("@/shared/ui/rich-text/RichTextEditor", () => ({
  RichTextEditor: ({
    initialContent,
    onChange,
    onEmptyChange,
    placeholder,
  }: {
    initialContent?: string;
    onChange: (value: string) => void;
    onEmptyChange?: (empty: boolean) => void;
    placeholder?: string;
  }) => (
    <div>
      <p>{placeholder}</p>
      <div data-testid="editor-initial-content">{initialContent ?? ""}</div>
      <button
        type="button"
        onClick={() => {
          onChange("Response draft");
          onEmptyChange?.(false);
        }}
      >
        Set response draft
      </button>
      <button
        type="button"
        onClick={() => {
          onChange("");
          onEmptyChange?.(true);
        }}
      >
        Clear response draft
      </button>
    </div>
  ),
}));

const reviewStaffTeamHealthMessageMock = vi.mocked(reviewStaffTeamHealthMessage);

function request(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    projectId: 22,
    teamId: 58,
    requesterUserId: 100 + id,
    reviewedByUserId: null,
    subject: `Subject ${id}`,
    details: `Details ${id}`,
    responseText: null,
    resolved: false,
    createdAt: `2026-04-${String((id % 9) + 1).padStart(2, "0")}T10:00:00.000Z`,
    updatedAt: `2026-04-${String((id % 9) + 1).padStart(2, "0")}T10:30:00.000Z`,
    reviewedAt: null,
    requester: {
      id: 100 + id,
      firstName: "Ali",
      lastName: `Student${id}`,
      email: `student${id}@example.com`,
    },
    reviewedBy: null,
    ...overrides,
  } as any;
}

describe("StaffTeamHealthMessageReviewPanel", () => {
  beforeEach(() => {
    reviewStaffTeamHealthMessageMock.mockReset();
  });

  it("renders empty state and initial load error", () => {
    render(
      <StaffTeamHealthMessageReviewPanel
        userId={9}
        projectId={22}
        teamId={58}
        initialRequests={[]}
        initialError="Failed to load support requests."
      />,
    );

    expect(screen.getByText("0 open · 0 total. Click to expand and respond.")).toBeInTheDocument();
    expect(screen.getByText("Review student-submitted queries and complaints, then respond directly from this panel.")).toBeInTheDocument();
    expect(screen.getByText("Failed to load support requests.")).toBeInTheDocument();
  });

  it("sorts unresolved requests first and by createdAt descending", () => {
    const { container } = render(
      <StaffTeamHealthMessageReviewPanel
        userId={9}
        projectId={22}
        teamId={58}
        initialRequests={[
          request(1, { subject: "Resolved old", resolved: true, createdAt: "2026-04-01T00:00:00.000Z" }),
          request(2, { subject: "Open newer", resolved: false, createdAt: "2026-04-08T00:00:00.000Z" }),
          request(3, { subject: "Open older", resolved: false, createdAt: "2026-04-03T00:00:00.000Z" }),
        ]}
      />,
    );

    expect(screen.getByText("2 open · 3 total. Click to expand and respond.")).toBeInTheDocument();
    const articleTitles = Array.from(container.querySelectorAll("article .staff-projects__team-title")).map((node) =>
      node.textContent?.trim(),
    );
    expect(articleTitles).toEqual(["Open newer", "Open older", "Resolved old"]);
  });

  it("opens and closes response editor by toggling respond button", async () => {
    const user = userEvent.setup();
    render(
      <StaffTeamHealthMessageReviewPanel
        userId={9}
        projectId={22}
        teamId={58}
        initialRequests={[request(5)]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Respond" }));
    expect(screen.getByRole("button", { name: "Send response" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close response" }));
    expect(screen.queryByRole("button", { name: "Send response" })).not.toBeInTheDocument();
  });

  it("validates empty response draft before submit", async () => {
    const user = userEvent.setup();
    render(
      <StaffTeamHealthMessageReviewPanel
        userId={9}
        projectId={22}
        teamId={58}
        initialRequests={[request(6)]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Respond" }));
    await user.click(screen.getByRole("button", { name: "Send response" }));

    expect(screen.getByText("Response cannot be empty.")).toBeInTheDocument();
  });

  it("submits response successfully and updates request card", async () => {
    const user = userEvent.setup();
    reviewStaffTeamHealthMessageMock.mockResolvedValue(
      request(7, {
        responseText: "Response draft",
        resolved: true,
        reviewedByUserId: 9,
        reviewedBy: { id: 9, firstName: "Staff", lastName: "Reviewer", email: "staff@example.com" },
        reviewedAt: "2026-04-11T12:00:00.000Z",
      }),
    );

    render(
      <StaffTeamHealthMessageReviewPanel
        userId={9}
        projectId={22}
        teamId={58}
        initialRequests={[request(7)]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Respond" }));
    await user.click(screen.getByRole("button", { name: "Set response draft" }));
    await user.click(screen.getByRole("button", { name: "Send response" }));

    await waitFor(() => {
      expect(reviewStaffTeamHealthMessageMock).toHaveBeenCalledWith(22, 58, 7, 9, true, "Response draft");
    });
    expect(screen.getByText("Response sent.")).toBeInTheDocument();
    expect(screen.getByText("Staff response")).toBeInTheDocument();
    expect(screen.getByText("Response draft")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send response" })).not.toBeInTheDocument();
  });

  it("reports response submit failures for Error and non-Error values", async () => {
    const user = userEvent.setup();
    reviewStaffTeamHealthMessageMock.mockRejectedValueOnce(new Error("review failed"));

    const firstRender = render(
      <StaffTeamHealthMessageReviewPanel
        userId={9}
        projectId={22}
        teamId={58}
        initialRequests={[request(8)]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Respond" }));
    await user.click(screen.getByRole("button", { name: "Set response draft" }));
    await user.click(screen.getByRole("button", { name: "Send response" }));
    await waitFor(() => expect(screen.getByText("review failed")).toBeInTheDocument());

    firstRender.unmount();

    reviewStaffTeamHealthMessageMock.mockRejectedValueOnce("x");
    render(
      <StaffTeamHealthMessageReviewPanel
        userId={9}
        projectId={22}
        teamId={58}
        initialRequests={[request(9)]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Respond" }));
    await user.click(screen.getByRole("button", { name: "Set response draft" }));
    await user.click(screen.getByRole("button", { name: "Send response" }));
    await waitFor(() => expect(screen.getByText("Failed to send response.")).toBeInTheDocument());
  });

  it("marks resolved request as unresolved and closes active response editor", async () => {
    const user = userEvent.setup();
    reviewStaffTeamHealthMessageMock.mockResolvedValue(
      request(10, {
        resolved: false,
        responseText: "Previous response",
      }),
    );

    render(
      <StaffTeamHealthMessageReviewPanel
        userId={9}
        projectId={22}
        teamId={58}
        initialRequests={[
          request(10, {
            resolved: true,
            responseText: "Previous response",
            reviewedByUserId: 11,
          }),
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit response" }));
    expect(screen.getByTestId("editor-initial-content")).toHaveTextContent("Previous response");

    await user.click(screen.getByRole("button", { name: "Mark unresolved" }));
    await waitFor(() => {
      expect(reviewStaffTeamHealthMessageMock).toHaveBeenCalledWith(22, 58, 10, 9, false);
    });
    expect(screen.getByText("Marked as unresolved.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send response" })).not.toBeInTheDocument();
  });

  it("supports pagination across request list", async () => {
    const user = userEvent.setup();
    render(
      <StaffTeamHealthMessageReviewPanel
        userId={9}
        projectId={22}
        teamId={58}
        initialRequests={Array.from({ length: 6 }, (_, index) => request(index + 1, { subject: `Message ${index + 1}` }))}
      />,
    );

    expect(screen.getByText("Page 1 / 2")).toBeInTheDocument();
    expect(screen.getByText("Message 6")).toBeInTheDocument();
    expect(screen.queryByText("Message 1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Page 2 / 2")).toBeInTheDocument();
    expect(screen.getByText("Message 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("Page 1 / 2")).toBeInTheDocument();
  });

  it("handles invalid dates and cancel action from response editor", async () => {
    render(
      <StaffTeamHealthMessageReviewPanel
        userId={9}
        projectId={22}
        teamId={58}
        initialRequests={[
          request(11, {
            createdAt: "invalid-date",
            requester: { id: 211, firstName: "A", lastName: "B", email: "ab@example.com" },
            reviewedBy: { id: 31, firstName: "X", lastName: "Y", email: "xy@example.com" },
            reviewedAt: "invalid-date",
            responseText: "Already handled",
            resolved: true,
          }),
        ]}
      />,
    );

    expect(screen.getByText("Submitted by A B on Unknown time")).toBeInTheDocument();
    expect(screen.getByText("Last updated by X Y on Unknown time")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit response" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("button", { name: "Send response" })).not.toBeInTheDocument();
  });
});
