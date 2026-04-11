"use client";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveStaffTeamWarning } from "@/features/projects/api/client";
import { StaffTeamWarningReviewPanel } from "./StaffTeamWarningReviewPanel";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/features/projects/api/client", () => ({
  resolveStaffTeamWarning: vi.fn(),
}));

const resolveStaffTeamWarningMock = vi.mocked(resolveStaffTeamWarning);

function warning(
  id: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    projectId: 22,
    teamId: 58,
    type: "COMMITS_LOW",
    severity: "MEDIUM",
    title: `Warning ${id}`,
    details: `Details ${id}`,
    source: "AUTO",
    active: true,
    createdAt: `2026-04-${String((id % 9) + 1).padStart(2, "0")}T10:00:00.000Z`,
    updatedAt: `2026-04-${String((id % 9) + 1).padStart(2, "0")}T10:30:00.000Z`,
    resolvedAt: null,
    ...overrides,
  } as any;
}

describe("StaffTeamWarningReviewPanel", () => {
  beforeEach(() => {
    resolveStaffTeamWarningMock.mockReset();
    refreshMock.mockReset();
  });

  it("renders empty states and initial error", () => {
    render(
      <StaffTeamWarningReviewPanel
        userId={9}
        projectId={22}
        teamId={58}
        initialWarnings={[]}
        initialError="Failed to load warning signals."
      />,
    );

    expect(screen.getByText("0 active warnings. Click to review.")).toBeInTheDocument();
    expect(screen.getByText("No active warnings.")).toBeInTheDocument();
    expect(screen.getByText("No resolved warnings yet.")).toBeInTheDocument();
    expect(screen.getByText("Failed to load warning signals.")).toBeInTheDocument();
  });

  it("renders active and resolved sections with date fallbacks", () => {
    render(
      <StaffTeamWarningReviewPanel
        userId={9}
        projectId={22}
        teamId={58}
        initialWarnings={[
          warning(1, { active: true, severity: "HIGH" }),
          warning(2, { active: false, resolvedAt: "invalid-date", updatedAt: "invalid-date" }),
        ]}
      />,
    );

    expect(screen.getByText("1 active warning. Click to review.")).toBeInTheDocument();
    expect(screen.getByText("Warning 1")).toBeInTheDocument();
    expect(screen.getByText("Triggered on 02/04/2026, 10:00:00 UTC")).toBeInTheDocument();
    expect(screen.getByText("Resolved history")).toBeInTheDocument();
    expect(screen.getByText("Warning 2")).toBeInTheDocument();
    expect(screen.getByText("Resolved on Unknown time")).toBeInTheDocument();
  });

  it("resolves an active warning and moves it to resolved history", async () => {
    const user = userEvent.setup();
    resolveStaffTeamWarningMock.mockResolvedValue(warning(1, { active: false }));

    render(
      <StaffTeamWarningReviewPanel
        userId={9}
        projectId={22}
        teamId={58}
        initialWarnings={[warning(1, { active: true })]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Resolve" }));

    await waitFor(() => {
      expect(resolveStaffTeamWarningMock).toHaveBeenCalledWith(9, 22, 58, 1);
    });
    expect(refreshMock).toHaveBeenCalled();
    expect(screen.getByText("Warning resolved.")).toBeInTheDocument();
    expect(screen.getByText("0 active warnings. Click to review.")).toBeInTheDocument();
    expect(screen.getByText(/Resolved on /)).toBeInTheDocument();
  });

  it("shows resolve error messages for Error and non-Error rejections", async () => {
    const user = userEvent.setup();

    resolveStaffTeamWarningMock.mockRejectedValueOnce(new Error("cannot resolve now"));
    const { rerender } = render(
      <StaffTeamWarningReviewPanel
        userId={9}
        projectId={22}
        teamId={58}
        initialWarnings={[warning(1)]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Resolve" }));
    await waitFor(() => expect(screen.getByText("cannot resolve now")).toBeInTheDocument());

    resolveStaffTeamWarningMock.mockRejectedValueOnce("x");
    rerender(
      <StaffTeamWarningReviewPanel
        userId={9}
        projectId={22}
        teamId={58}
        initialWarnings={[warning(2)]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Resolve" }));
    await waitFor(() => expect(screen.getByText("Failed to resolve warning.")).toBeInTheDocument());
  });

  it("supports pagination for active and resolved warnings", async () => {
    const user = userEvent.setup();
    const activeWarnings = Array.from({ length: 6 }, (_, index) => warning(index + 1, { title: `Active ${index + 1}` }));
    const resolvedWarnings = Array.from(
      { length: 6 },
      (_, index) =>
        warning(index + 101, {
          title: `Resolved ${index + 1}`,
          active: false,
          resolvedAt: `2026-03-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
        }),
    );

    render(
      <StaffTeamWarningReviewPanel
        userId={9}
        projectId={22}
        teamId={58}
        initialWarnings={[...activeWarnings, ...resolvedWarnings]}
      />,
    );

    const activeSection = screen.getByText("6 active warnings. Click to review.").closest("details");
    expect(activeSection).not.toBeNull();
    if (!activeSection) return;

    expect(screen.getAllByText("Page 1 / 2")).toHaveLength(2);
    expect(screen.getByText("Active 6")).toBeInTheDocument();
    expect(screen.queryByText("Active 1")).not.toBeInTheDocument();

    const nextButtons = screen.getAllByRole("button", { name: "Next" });
    await user.click(nextButtons[0]);
    expect(screen.getByText("Page 2 / 2")).toBeInTheDocument();
    expect(screen.getByText("Active 1")).toBeInTheDocument();

    const resolvedHistoryTitle = screen.getByText("Resolved history");
    const resolvedSection = resolvedHistoryTitle.parentElement;
    expect(resolvedSection).not.toBeNull();
    if (!resolvedSection) return;

    const resolvedNextButton = within(resolvedSection).getByRole("button", { name: "Next" });
    await user.click(resolvedNextButton);
    expect(within(resolvedSection).getByText("Page 2 / 2")).toBeInTheDocument();
    expect(screen.getByText("Resolved 1")).toBeInTheDocument();
  });
});
