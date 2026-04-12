import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AdminUser, EnterpriseRecord } from "../../types";
import { buildEnterpriseRows, buildEnterpriseUserRows } from "./enterpriseManagementRows";

const enterprise: EnterpriseRecord = {
  id: "ent_1",
  name: "King's College London",
  code: "KCL",
  createdAt: "2026-03-01T10:30:00.000Z",
  users: 5,
  admins: 1,
  enterpriseAdmins: 1,
  staff: 1,
  students: 2,
  modules: 3,
  teams: 4,
};

describe("enterpriseManagementRows", () => {
  it("builds enterprise rows with account/workspace details and actions", async () => {
    const user = userEvent.setup();
    const onOpenAccounts = vi.fn();
    const onRequestDelete = vi.fn();
    const rows = buildEnterpriseRows({
      enterprises: [enterprise],
      deleteState: {},
      onOpenAccounts,
      onRequestDelete,
      formatDate: () => "01 Mar 2026",
    });

    render(<>{rows[0]}</>);

    expect(screen.getByText("King's College London")).toBeInTheDocument();
    expect(screen.getByText("Code: KCL")).toBeInTheDocument();
    expect(screen.getByText("5 accounts")).toBeInTheDocument();
    expect(screen.getByText("3 modules")).toBeInTheDocument();
    expect(screen.getByText("01 Mar 2026")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /manage accounts/i }));
    expect(onOpenAccounts).toHaveBeenCalledWith(enterprise);

    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(onRequestDelete).toHaveBeenCalledWith(enterprise);
  });

  it("disables enterprise delete while pending", () => {
    const rows = buildEnterpriseRows({
      enterprises: [enterprise],
      deleteState: { ent_1: true },
      onOpenAccounts: vi.fn(),
      onRequestDelete: vi.fn(),
      formatDate: (value) => value,
    });

    render(<>{rows[0]}</>);
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeDisabled();
  });

  it("renders enterprise user role/status controls across role variants", async () => {
    const user = userEvent.setup();
    const onRoleChange = vi.fn();
    const onStatusToggle = vi.fn();

    const studentUser: AdminUser = {
      id: 10,
      email: "student@example.com",
      firstName: "Student",
      lastName: "One",
      isStaff: false,
      role: "STUDENT",
      active: true,
    };
    const staffUser: AdminUser = { ...studentUser, id: 11, role: "STAFF", isStaff: true, active: false };
    const adminUser: AdminUser = { ...studentUser, id: 12, role: "ADMIN", email: "admin@example.com" };
    const enterpriseAdminUser: AdminUser = {
      ...studentUser,
      id: 13,
      role: "ENTERPRISE_ADMIN",
      email: "enterprise-admin@example.com",
    };
    const staffUserNotBusy: AdminUser = {
      ...studentUser,
      id: 15,
      role: "STAFF",
      email: "staff-member@example.com",
      isStaff: true,
    };
    const superAdminUser: AdminUser = {
      ...studentUser,
      id: 14,
      role: "ADMIN",
      email: "admin@kcl.ac.uk",
      active: false,
    };

    const rows = buildEnterpriseUserRows({
      users: [studentUser, staffUser, adminUser, enterpriseAdminUser, superAdminUser, staffUserNotBusy],
      actionState: { 11: "loading" },
      onRoleChange,
      onStatusToggle,
    });

    let view = render(<>{rows[0]}</>);
    const studentButton = screen.getByRole("button", { name: /^student$/i });
    const staffButton = screen.getByRole("button", { name: /^staff$/i });
    expect(studentButton).toBeDisabled();
    expect(staffButton).toBeEnabled();
    await user.click(staffButton);
    expect(onRoleChange).toHaveBeenCalledWith(10, "STAFF");

    const activeStatusButton = screen.getByRole("button", { name: /active/i });
    await user.click(activeStatusButton);
    expect(onStatusToggle).toHaveBeenCalledWith(10, false);

    view.unmount();
    view = render(<>{rows[1]}</>);
    expect(screen.getByRole("button", { name: /^student$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^staff$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /suspended/i })).toBeDisabled();

    view.unmount();
    view = render(<>{rows[2]}</>);
    expect(view.container.querySelector(".role-chip")).toHaveTextContent("Admin");

    view.unmount();
    view = render(<>{rows[3]}</>);
    expect(view.container.querySelector(".role-chip--locked")).toHaveTextContent("Enterprise admin");

    view.unmount();
    view = render(<>{rows[4]}</>);
    expect(screen.queryByRole("button", { name: /active/i })).not.toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();

    view.unmount();
    view = render(<>{rows[5]}</>);
    await user.click(screen.getByRole("button", { name: /^student$/i }));
    expect(onRoleChange).toHaveBeenCalledWith(15, "STUDENT");
  });
});
