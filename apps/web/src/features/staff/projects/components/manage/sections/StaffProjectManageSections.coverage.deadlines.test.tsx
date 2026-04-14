import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { StaffProjectManageSummary } from "@/features/projects/types";
import { ApiError } from "@/shared/api/errors";
import {
  buildDeadlineSnapshot,
  buildInitial,
  patchMock,
  StaffProjectManageProjectDeadlinesSection,
  withProvider,
} from "./StaffProjectManageSections.coverage.shared";

describe("StaffProjectManageProjectDeadlinesSection coverage", () => {
  it("shows empty state when no deadline snapshot exists", () => {
    render(withProvider(<StaffProjectManageProjectDeadlinesSection />, buildInitial({ projectDeadline: null })));
    expect(screen.getByText(/no project deadline record is available/i)).toBeInTheDocument();
  });

  it("maps null ISO fields to empty inputs", () => {
    render(
      withProvider(
        <StaffProjectManageProjectDeadlinesSection />,
        buildInitial({
          projectDeadline: buildDeadlineSnapshot({
            taskOpenDate: null,
            teamAllocationQuestionnaireOpenDate: "not-a-date",
          }),
        }),
      ),
    );
    const taskOpens = screen.getByLabelText(/^task opens$/i);
    expect(taskOpens).toHaveValue("");
  });

  it("validates required deadlines, saves, and surfaces errors", async () => {
    const user = userEvent.setup();
    const initial = buildInitial();
    render(withProvider(<StaffProjectManageProjectDeadlinesSection />, initial));
    const taskOpens = screen.getByLabelText(/^task opens$/i);
    await user.clear(taskOpens);
    await user.click(screen.getByRole("button", { name: /save deadlines/i }));
    expect(await screen.findByText(/each required deadline must have a valid date and time/i)).toBeInTheDocument();

    fireEvent.change(taskOpens, { target: { value: "2026-01-01T00:00" } });
    patchMock.mockResolvedValueOnce(initial);
    await user.click(screen.getByRole("button", { name: /save deadlines/i }));
    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    expect(await screen.findByText(/project deadlines updated/i)).toBeInTheDocument();

    patchMock.mockRejectedValueOnce(new ApiError("nope"));
    await user.click(screen.getByRole("button", { name: /save deadlines/i }));
    expect(await screen.findByText("nope")).toBeInTheDocument();

    patchMock.mockRejectedValueOnce(new Error("z"));
    await user.click(screen.getByRole("button", { name: /save deadlines/i }));
    expect(await screen.findByText(/could not save deadlines/i)).toBeInTheDocument();
  });

  it("shows saving label while patch is pending", async () => {
    const user = userEvent.setup();
    let resolvePatch!: (v: StaffProjectManageSummary) => void;
    patchMock.mockReturnValueOnce(
      new Promise<StaffProjectManageSummary>((r) => {
        resolvePatch = r;
      }),
    );
    render(withProvider(<StaffProjectManageProjectDeadlinesSection />, buildInitial()));
    await user.click(screen.getByRole("button", { name: /save deadlines/i }));
    expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
    resolvePatch!(buildInitial());
    await waitFor(() => expect(screen.getByRole("button", { name: /^save deadlines$/i })).toBeInTheDocument());
  });

  it("persists optional team allocation dates when both fields are valid", async () => {
    const user = userEvent.setup();
    const initial = buildInitial({
      projectDeadline: buildDeadlineSnapshot({
        teamAllocationQuestionnaireOpenDate: null,
        teamAllocationQuestionnaireDueDate: null,
      }),
    });
    patchMock.mockImplementation(async (_id, body: { deadline: Record<string, unknown> }) => {
      expect(body.deadline.teamAllocationQuestionnaireOpenDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(body.deadline.teamAllocationQuestionnaireDueDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      return initial;
    });
    render(withProvider(<StaffProjectManageProjectDeadlinesSection />, initial));
    const teamAllocFieldset = screen.getByText(/team allocation questionnaire/i).closest("fieldset")!;
    fireEvent.change(within(teamAllocFieldset).getByLabelText(/^opens$/i), { target: { value: "2026-04-01T09:00" } });
    fireEvent.change(within(teamAllocFieldset).getByLabelText(/^due$/i), { target: { value: "2026-04-02T17:00" } });
    await user.click(screen.getByRole("button", { name: /save deadlines/i }));
    await waitFor(() => expect(patchMock).toHaveBeenCalled());
  });

  it("allows invalid optional team allocation strings in the payload when core dates are valid", async () => {
    const user = userEvent.setup();
    const initial = buildInitial();
    patchMock.mockResolvedValueOnce(initial);
    render(withProvider(<StaffProjectManageProjectDeadlinesSection />, initial));
    const teamAllocFieldset = screen.getByText(/team allocation questionnaire/i).closest("fieldset")!;
    const openField = within(teamAllocFieldset).getByLabelText(/^opens$/i);
    fireEvent.change(openField, { target: { value: "  not-a-date  " } });
    await user.click(screen.getByRole("button", { name: /save deadlines/i }));
    await waitFor(() => expect(patchMock).toHaveBeenCalled());
  });

  it("stores optional team allocation dates as null when cleared", async () => {
    const user = userEvent.setup();
    const initial = buildInitial({
      projectDeadline: buildDeadlineSnapshot({
        teamAllocationQuestionnaireOpenDate: "2026-03-01T12:00:00.000Z",
        teamAllocationQuestionnaireDueDate: "2026-03-02T12:00:00.000Z",
      }),
    });
    patchMock.mockImplementation(async (_id, body: { deadline: Record<string, unknown> }) => {
      expect(body.deadline.teamAllocationQuestionnaireOpenDate).toBeNull();
      expect(body.deadline.teamAllocationQuestionnaireDueDate).toBeNull();
      return initial;
    });
    render(withProvider(<StaffProjectManageProjectDeadlinesSection />, initial));
    const teamAllocFieldset = screen.getByText(/team allocation questionnaire/i).closest("fieldset")!;
    const openField = within(teamAllocFieldset).getByLabelText(/^opens$/i);
    const dueField = within(teamAllocFieldset).getByLabelText(/^due$/i);
    await user.clear(openField);
    await user.clear(dueField);
    await user.click(screen.getByRole("button", { name: /save deadlines/i }));
    await waitFor(() => expect(patchMock).toHaveBeenCalled());
  });
});
