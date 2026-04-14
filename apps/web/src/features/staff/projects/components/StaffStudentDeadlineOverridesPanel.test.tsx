import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { StaffStudentDeadlineOverridesPanel } from "./StaffStudentDeadlineOverridesPanel";
import {
  clearStaffStudentDeadlineOverride,
  getStaffStudentDeadlineOverrides,
  upsertStaffStudentDeadlineOverride,
} from "@/features/projects/api/client";

vi.mock("@/features/projects/api/client", () => ({
  clearStaffStudentDeadlineOverride: vi.fn(),
  getStaffStudentDeadlineOverrides: vi.fn(),
  upsertStaffStudentDeadlineOverride: vi.fn(),
}));

const getOverridesMock = vi.mocked(getStaffStudentDeadlineOverrides);
const upsertOverrideMock = vi.mocked(upsertStaffStudentDeadlineOverride);
const clearOverrideMock = vi.mocked(clearStaffStudentDeadlineOverride);

const members = [
  { id: 1, firstName: "Ali", lastName: "Mohammed", email: "ali@kcl.ac.uk" },
  { id: 2, firstName: "Andres", lastName: "Zacchi", email: "andres@kcl.ac.uk" },
];

describe("StaffStudentDeadlineOverridesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOverridesMock.mockResolvedValue([]);
    upsertOverrideMock.mockResolvedValue({
      userId: 1,
      reason: "Extension approved",
      taskOpenDate: null,
      taskDueDate: null,
      assessmentOpenDate: null,
      assessmentDueDate: null,
      feedbackOpenDate: null,
      feedbackDueDate: null,
    } as any);
    clearOverrideMock.mockResolvedValue(undefined as any);
  });

  it("loads overrides, filters students, saves, and clears an override", async () => {
    render(<StaffStudentDeadlineOverridesPanel projectId={7} members={members} />);

    await waitFor(() => expect(getOverridesMock).toHaveBeenCalledWith(7));
    expect(screen.getByText("Ali Mohammed")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search students in deadline overrides/i), {
      target: { value: "andres" },
    });
    expect(screen.queryByText("Ali Mohammed")).not.toBeInTheDocument();
    expect(screen.getByText("Andres Zacchi")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search students in deadline overrides/i), {
      target: { value: "" },
    });
    const aliCard = screen.getByText("Ali Mohammed").closest("article")!;
    fireEvent.click(within(aliCard).getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByLabelText("Task open"), { target: { value: "2026-06-01T10:00" } });
    fireEvent.change(screen.getByLabelText("Task due"), { target: { value: "2026-06-02T10:00" } });
    fireEvent.change(screen.getByLabelText("Assessment open"), { target: { value: "2026-06-03T10:00" } });
    fireEvent.change(screen.getByLabelText("Assessment due"), { target: { value: "2026-06-04T10:00" } });
    fireEvent.change(screen.getByLabelText("Feedback open"), { target: { value: "2026-06-05T10:00" } });
    fireEvent.change(screen.getByLabelText("Feedback due"), { target: { value: "2026-06-06T10:00" } });
    fireEvent.change(screen.getByPlaceholderText(/reason for this student-specific override/i), {
      target: { value: "Extension approved" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save override/i }));

    await waitFor(() => expect(upsertOverrideMock).toHaveBeenCalledWith(7, 1, expect.objectContaining({
      reason: "Extension approved",
    })));
    expect(screen.getByText("Override active")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear override/i }));
    await waitFor(() => expect(clearOverrideMock).toHaveBeenCalledWith(7, 1));
  });

  it("renders the empty-state and load error branches", async () => {
    getOverridesMock.mockRejectedValueOnce(new Error("Failed to load student overrides."));

    const { rerender } = render(<StaffStudentDeadlineOverridesPanel projectId={7} members={members} />);
    expect(await screen.findByText("Failed to load student overrides.")).toBeInTheDocument();

    rerender(<StaffStudentDeadlineOverridesPanel projectId={7} members={[]} />);
    await waitFor(() => expect(getOverridesMock).toHaveBeenCalled());
    expect(screen.getByText("No students are available for this team.")).toBeInTheDocument();
  });

  it("shows read-only copy and toggles view/hide without edit actions", async () => {
    render(<StaffStudentDeadlineOverridesPanel projectId={7} members={members} readOnly />);
    await waitFor(() => expect(getOverridesMock).toHaveBeenCalledWith(7));

    expect(screen.getByText("This module is archived; overrides are read-only.")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "View" })[0]!);
    expect(screen.getByRole("button", { name: "Hide" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save override/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear override/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(screen.getAllByRole("button", { name: "View" }).length).toBeGreaterThan(0);
  });

  it("renders no-match search message when query does not match any student", async () => {
    render(<StaffStudentDeadlineOverridesPanel projectId={7} members={members} />);
    await waitFor(() => expect(getOverridesMock).toHaveBeenCalledWith(7));

    fireEvent.change(screen.getByLabelText(/search students in deadline overrides/i), {
      target: { value: "nomatch" },
    });
    expect(screen.getByText('No students match "nomatch".')).toBeInTheDocument();
  });

  it("uses fallback load error message for non-Error rejections", async () => {
    getOverridesMock.mockRejectedValueOnce("failed");
    render(<StaffStudentDeadlineOverridesPanel projectId={7} members={members} />);
    expect(await screen.findByText("Failed to load student overrides.")).toBeInTheDocument();
  });

  it("uses fallback action error messages when save or clear fails", async () => {
    upsertOverrideMock.mockRejectedValueOnce("save failed");
    clearOverrideMock.mockRejectedValueOnce("clear failed");
    render(<StaffStudentDeadlineOverridesPanel projectId={7} members={members} />);
    await waitFor(() => expect(getOverridesMock).toHaveBeenCalledWith(7));

    const aliCard = screen.getByText("Ali Mohammed").closest("article")!;
    fireEvent.click(within(aliCard).getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /save override/i }));
    expect(await screen.findByText("Failed to save override.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear override/i }));
    expect(await screen.findByText("Failed to clear override.")).toBeInTheDocument();
  });

  it("ignores late load completion after unmount", async () => {
    let resolveLoad: ((items: unknown) => void) | null = null;
    getOverridesMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        }) as any
    );

    const { unmount } = render(<StaffStudentDeadlineOverridesPanel projectId={7} members={members} />);
    unmount();

    resolveLoad?.([]);
    await waitFor(() => expect(getOverridesMock).toHaveBeenCalledWith(7));
  });

  it("ignores late load rejection after unmount", async () => {
    let rejectLoad: ((error: unknown) => void) | null = null;
    getOverridesMock.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectLoad = reject;
        }) as any
    );

    const { unmount } = render(<StaffStudentDeadlineOverridesPanel projectId={7} members={members} />);
    unmount();
    rejectLoad?.(new Error("late failure"));
    await waitFor(() => expect(getOverridesMock).toHaveBeenCalledWith(7));
  });
});
