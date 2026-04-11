import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminPage from "./page";

vi.mock("@/features/admin/components/AdminWorkspaceSummary", () => ({
  AdminWorkspaceSummary: () => <div data-testid="admin-workspace-summary" />,
}));

vi.mock("@/features/admin/components/UserManagementTable", () => ({
  UserManagementTable: () => <div data-testid="user-management-table" />,
}));

describe("AdminPage", () => {
  it("renders admin workspace heading, description, and key panels", () => {
    render(<AdminPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Admin workspace" })).toBeInTheDocument();
    expect(screen.getByText("Manage platform-level users, access, and operational controls.")).toBeInTheDocument();
    expect(screen.getByTestId("admin-workspace-summary")).toBeInTheDocument();
    expect(screen.getByTestId("user-management-table")).toBeInTheDocument();
  });
});
