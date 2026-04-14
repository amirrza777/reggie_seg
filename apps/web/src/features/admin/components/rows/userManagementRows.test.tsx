import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AdminUser } from "../../types";
import { buildUserManagementRows } from "./userManagementRows";

vi.mock("./RowActionMenu", () => ({
  RowActionMenu: ({
    userId,
    onRemove,
    onReinstate,
  }: {
    userId: number;
    onRemove: (id: number) => void;
    onReinstate: (id: number) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onRemove(userId)}>
        Remove {userId}
      </button>
      <button type="button" onClick={() => onReinstate(userId)}>
        Reinstate {userId}
      </button>
    </div>
  ),
}));

function makeUser(overrides: Partial<AdminUser>): AdminUser {
  return {
    id: 1,
    email: "student@example.com",
    firstName: "Jane",
    lastName: "Doe",
    isStaff: false,
    role: "STUDENT",
    active: true,
    enterprise: {
      id: "ent_1",
      name: "Acme University",
      code: "ACME",
    },
    ...overrides,
  };
}

describe("userManagementRows", () => {
  it("renders enterprise labels and role/status/actions controls", async () => {
    const user = userEvent.setup();
    const onRoleChange = vi.fn();
    const onStatusToggle = vi.fn();
    const onRequestRemoveUser = vi.fn();

    const users: AdminUser[] = [
      makeUser({ id: 1, enterprise: { id: "ent_1", name: "Ignored", code: "UNASSIGNED" } }),
      makeUser({ id: 2, email: "staff@example.com", role: "STAFF", isStaff: true, active: false, enterprise: { id: "ent_2", name: "", code: "KCL" } }),
      makeUser({ id: 3, email: "admin@kcl.ac.uk", role: "ADMIN", active: false }),
      makeUser({ id: 4, email: "ea@example.com", role: "ENTERPRISE_ADMIN", enterprise: null }),
    ];

    const rows = buildUserManagementRows({
      users,
      busy: false,
      onRoleChange,
      onStatusToggle,
      onRequestRemoveUser,
    });

    render(<>{rows.flat()}</>);

    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("KCL")).toBeInTheDocument();
    expect(screen.getByText("Unknown enterprise")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Enterprise admin")).toBeInTheDocument();

    const staffButtons = screen.getAllByRole("button", { name: "Staff" });
    await user.click(staffButtons[0]);
    expect(onRoleChange).toHaveBeenCalledWith(1, "STAFF");

    const studentButtons = screen.getAllByRole("button", { name: "Student" });
    const enabledStudentButton = studentButtons.find((button) => !button.hasAttribute("disabled"));
    expect(enabledStudentButton).toBeDefined();
    if (enabledStudentButton) {
      await user.click(enabledStudentButton);
    }
    expect(onRoleChange).toHaveBeenCalledWith(2, "STUDENT");

    const activeStatusButtons = screen.getAllByRole("button", { name: /Active/i });
    await user.click(activeStatusButtons[0]);
    await user.click(screen.getByRole("button", { name: /Suspended/i }));
    expect(onStatusToggle).toHaveBeenCalledWith(1, false);
    expect(onStatusToggle).toHaveBeenCalledWith(2, true);

    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Remove 1" }));
    expect(onRequestRemoveUser).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole("button", { name: "Reinstate 2" }));
    expect(onStatusToggle).toHaveBeenCalledWith(2, true);
  });

  it("disables role/status controls when busy", () => {
    const rows = buildUserManagementRows({
      users: [makeUser({ id: 10, role: "STAFF", active: false })],
      busy: true,
      onRoleChange: vi.fn(),
      onStatusToggle: vi.fn(),
      onRequestRemoveUser: vi.fn(),
    });

    render(<>{rows[0]}</>);
    expect(screen.getByRole("button", { name: "Student" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Staff" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Suspended/i })).toBeEnabled();
  });
});
