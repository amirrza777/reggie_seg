import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DangerZoneSection } from "./page.profile-settings.danger-zone";

describe("DangerZoneSection", () => {
  it("disables leave action for unassigned users and forbidden roles", () => {
    const onOpenLeaveModal = vi.fn();
    const onOpenDeleteModal = vi.fn();

    const { rerender } = render(
      <DangerZoneSection
        profile={{ role: "STUDENT", isUnassigned: true }}
        onOpenLeaveModal={onOpenLeaveModal}
        onOpenDeleteModal={onOpenDeleteModal}
      />,
    );

    expect(screen.getByText("This account is already not assigned to an enterprise.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave enterprise" })).toBeDisabled();

    rerender(
      <DangerZoneSection
        profile={{ role: "ADMIN", isUnassigned: false }}
        onOpenLeaveModal={onOpenLeaveModal}
        onOpenDeleteModal={onOpenDeleteModal}
      />,
    );
    expect(screen.getByText("This responsibility level cannot leave enterprise directly.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave enterprise" })).toBeDisabled();
  });

  it("enables leave action for non-admin users and always allows delete action", () => {
    const onOpenLeaveModal = vi.fn();
    const onOpenDeleteModal = vi.fn();

    render(
      <DangerZoneSection
        profile={{ role: "STUDENT", isUnassigned: false, isEnterpriseAdmin: false, isAdmin: false }}
        onOpenLeaveModal={onOpenLeaveModal}
        onOpenDeleteModal={onOpenDeleteModal}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Leave enterprise" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));

    expect(onOpenLeaveModal).toHaveBeenCalled();
    expect(onOpenDeleteModal).toHaveBeenCalled();
    expect(screen.getByText("Remove this account from the current enterprise workspace.")).toBeInTheDocument();
  });
});
