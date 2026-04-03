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
});
