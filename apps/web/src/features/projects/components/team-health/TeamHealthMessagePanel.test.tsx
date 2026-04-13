"use client";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTeamHealthMessage } from "../../api/client";
import { TeamHealthMessagePanel } from "./TeamHealthMessagePanel";

vi.mock("../../api/client", () => ({
  createTeamHealthMessage: vi.fn(),
}));

vi.mock("@/shared/ui/rich-text/RichTextEditor", () => ({
  RichTextEditor: ({
    onChange,
    onEmptyChange,
    placeholder,
  }: {
    onChange: (value: string) => void;
    onEmptyChange?: (empty: boolean) => void;
    placeholder?: string;
  }) => (
    <div>
      <p>{placeholder}</p>
      <button
        type="button"
        onClick={() => {
          onChange("Detailed message body");
          onEmptyChange?.(false);
        }}
      >
        Set details
      </button>
      <button
        type="button"
        onClick={() => {
          onChange("");
          onEmptyChange?.(true);
        }}
      >
        Clear details
      </button>
    </div>
  ),
}));

vi.mock("@/shared/ui/rich-text/RichTextViewer", () => ({
  RichTextViewer: ({ content }: { content: string }) => <div data-testid="rich-text-viewer">{content}</div>,
}));

const createTeamHealthMessageMock = vi.mocked(createTeamHealthMessage);

function message(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    projectId: 11,
    teamId: 2,
    requesterUserId: 77,
    reviewedByUserId: null,
    subject: `Message ${id}`,
    details: `Details ${id}`,
    responseText: null,
    resolved: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    reviewedAt: null,
    requester: {
      id: 77,
      firstName: "Ali",
      lastName: "Demir",
      email: "ali@example.com",
    },
    reviewedBy: null,
    ...overrides,
  } as any;
}

describe("TeamHealthMessagePanel", () => {
  beforeEach(() => {
    createTeamHealthMessageMock.mockReset();
  });

  it("hides composer when allowNewMessages is false", () => {
    render(
      <TeamHealthMessagePanel
        projectId={11}
        userId={77}
        initialRequests={[]}
        allowNewMessages={false}
      />,
    );

    expect(screen.queryByText("Subject")).not.toBeInTheDocument();
    expect(screen.getByText("No team health messages yet.")).toBeInTheDocument();
  });

  it("validates subject and details when form is submitted directly", () => {
    const { container } = render(
      <TeamHealthMessagePanel
        projectId={11}
        userId={77}
        initialRequests={[]}
      />,
    );

    const form = container.querySelector("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    expect(screen.getByText("Please add both a subject and details.")).toBeInTheDocument();
  });

  it("submits a new message and prepends it to list", async () => {
    const user = userEvent.setup();
    createTeamHealthMessageMock.mockResolvedValue(
      message(999, {
        subject: "Blocked by API outage",
        details: "Detailed message body",
      }),
    );

    render(
      <TeamHealthMessagePanel
        projectId={11}
        userId={77}
        initialRequests={[message(1)]}
      />,
    );

    await user.type(screen.getByPlaceholderText("Short summary of the issue"), "Blocked by API outage");
    await user.click(screen.getByRole("button", { name: "Set details" }));
    await user.click(screen.getByRole("button", { name: "Submit Team Health Message" }));

    await waitFor(() => {
      expect(createTeamHealthMessageMock).toHaveBeenCalledWith(11, 77, "Blocked by API outage", "Detailed message body");
    });
    expect(screen.getByText("Team health message submitted.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("")).toBeInTheDocument();
    expect(screen.getByText("Blocked by API outage")).toBeInTheDocument();
  });

  it("shows API failure message on submit error", async () => {
    const user = userEvent.setup();
    createTeamHealthMessageMock.mockRejectedValue(new Error("network down"));

    render(
      <TeamHealthMessagePanel
        projectId={11}
        userId={77}
        initialRequests={[]}
      />,
    );

    await user.type(screen.getByPlaceholderText("Short summary of the issue"), "Subject");
    await user.click(screen.getByRole("button", { name: "Set details" }));
    await user.click(screen.getByRole("button", { name: "Submit Team Health Message" }));

    await waitFor(() => {
      expect(screen.getByText("network down")).toBeInTheDocument();
    });
  });

  it("renders response metadata with staff response block", () => {
    render(
      <TeamHealthMessagePanel
        projectId={11}
        userId={77}
        initialRequests={[
          message(10, {
            resolved: true,
            responseText: "We reviewed this and resolved it.",
            requester: { id: 88, firstName: "", lastName: "", email: "fallback@example.com" },
            createdAt: "invalid-date",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.getByText("Staff response")).toBeInTheDocument();
    expect(screen.getByText("We reviewed this and resolved it.")).toBeInTheDocument();
    expect(screen.getByText("Author: fallback@example.com")).toBeInTheDocument();
    expect(screen.getByText("Submitted: Unknown time")).toBeInTheDocument();
  });

  it("falls back to requester user id when author identity is missing", () => {
    render(
      <TeamHealthMessagePanel
        projectId={11}
        userId={77}
        initialRequests={[
          message(13, {
            requester: undefined,
            requesterUserId: 501,
          }),
        ]}
      />,
    );

    expect(screen.getByText("Author: User #501")).toBeInTheDocument();
  });

  it("shows generic submit error message for non-Error rejection values", async () => {
    const user = userEvent.setup();
    createTeamHealthMessageMock.mockRejectedValue("unexpected");

    render(
      <TeamHealthMessagePanel
        projectId={11}
        userId={77}
        initialRequests={[]}
      />,
    );

    await user.type(screen.getByPlaceholderText("Short summary of the issue"), "Subject");
    await user.click(screen.getByRole("button", { name: "Set details" }));
    await user.click(screen.getByRole("button", { name: "Submit Team Health Message" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to submit team health message.")).toBeInTheDocument();
    });
  });

  it("paginates messages", async () => {
    const user = userEvent.setup();
    render(
      <TeamHealthMessagePanel
        projectId={11}
        userId={77}
        initialRequests={Array.from({ length: 6 }, (_, index) => message(index + 1))}
      />,
    );

    expect(screen.getByText("Message 1")).toBeInTheDocument();
    expect(screen.queryByText("Message 6")).not.toBeInTheDocument();
    expect(screen.getByText("Page 1 / 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Message 6")).toBeInTheDocument();
    expect(screen.getByText("Page 2 / 2")).toBeInTheDocument();
  });
});
