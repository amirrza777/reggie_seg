import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRouter } from "next/navigation";
import { updateStaffTeamDeadlineProfile } from "@/features/projects/api/client";
import { StaffTeamDeadlineProfileControl } from "./StaffTeamDeadlineProfileControl";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  updateStaffTeamDeadlineProfile: vi.fn(),
}));

vi.mock("@/shared/ui/modal/ConfirmationModal", () => ({
  ConfirmationModal: ({
    open,
    title,
    message,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
  }: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
  }) =>
    open ? (
      <div data-testid="confirm-modal">
        <h4>{title}</h4>
        <p>{message}</p>
        <button onClick={onConfirm}>{confirmLabel}</button>
        <button onClick={onCancel}>{cancelLabel}</button>
      </div>
    ) : null,
}));

const useRouterMock = vi.mocked(useRouter);
const updateStaffTeamDeadlineProfileMock = vi.mocked(updateStaffTeamDeadlineProfile);
const refreshMock = vi.fn();

describe("StaffTeamDeadlineProfileControl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouterMock.mockReturnValue({ refresh: refreshMock } as ReturnType<typeof useRouter>);
  });

  it("opens confirmation modal when selecting a different profile", async () => {
    const user = userEvent.setup();
    render(<StaffTeamDeadlineProfileControl teamId={19} initialProfile="STANDARD" />);

    await user.click(screen.getByRole("button", { name: "MCF" }));

    expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "Grant MCF schedule?" })).toBeInTheDocument();
  });

  it("does not open the modal when selecting the current profile", async () => {
    const user = userEvent.setup();
    render(<StaffTeamDeadlineProfileControl teamId={19} initialProfile="STANDARD" />);

    await user.click(screen.getByRole("button", { name: "Standard" }));
    expect(screen.queryByTestId("confirm-modal")).not.toBeInTheDocument();
  });

  it("submits profile update and refreshes on confirm", async () => {
    const user = userEvent.setup();
    updateStaffTeamDeadlineProfileMock.mockResolvedValueOnce({ id: 19, deadlineProfile: "MCF" });

    render(<StaffTeamDeadlineProfileControl teamId={19} initialProfile="STANDARD" />);

    await user.click(screen.getByRole("button", { name: "MCF" }));
    await user.click(screen.getByRole("button", { name: "Grant MCF" }));

    await waitFor(() => {
      expect(updateStaffTeamDeadlineProfileMock).toHaveBeenCalledWith(19, "MCF");
    });
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("confirm-modal")).not.toBeInTheDocument();
  });

  it("shows API errors when update fails", async () => {
    const user = userEvent.setup();
    updateStaffTeamDeadlineProfileMock.mockRejectedValueOnce(new Error("cannot update"));

    render(<StaffTeamDeadlineProfileControl teamId={22} initialProfile="MCF" />);

    await user.click(screen.getByRole("button", { name: "Standard" }));
    await user.click(screen.getByRole("button", { name: "Revert to standard" }));

    expect(await screen.findByText("cannot update")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("closes confirmation modal when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<StaffTeamDeadlineProfileControl teamId={22} initialProfile="MCF" />);

    await user.click(screen.getByRole("button", { name: "Standard" }));
    expect(screen.getByTestId("confirm-modal")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByTestId("confirm-modal")).not.toBeInTheDocument();
  });

  it("renders archived read-only state and prevents profile changes", async () => {
    const user = userEvent.setup();
    render(<StaffTeamDeadlineProfileControl teamId={19} initialProfile="STANDARD" readOnly />);

    expect(screen.getByText("This module is archived; the deadline profile cannot be changed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Standard" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "MCF" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "MCF" }));

    expect(screen.queryByTestId("confirm-modal")).not.toBeInTheDocument();
    expect(updateStaffTeamDeadlineProfileMock).not.toHaveBeenCalled();
  });
});
