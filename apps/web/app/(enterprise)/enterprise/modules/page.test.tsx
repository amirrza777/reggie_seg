import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EnterpriseModulesPage from "./page";
import { getCurrentUser, isAdmin, isEnterpriseAdmin } from "@/shared/auth/session";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
  isAdmin: vi.fn(),
  isEnterpriseAdmin: vi.fn(),
}));

vi.mock("@/features/enterprise/components/EnterpriseModuleManager", () => ({
  EnterpriseModuleManager: ({
    canCreateModule,
    enterpriseName,
  }: {
    canCreateModule: boolean;
    enterpriseName: string | null;
  }) => (
    <div
      data-testid="enterprise-module-manager"
      data-can-create={canCreateModule ? "1" : "0"}
      data-enterprise-name={enterpriseName ?? ""}
    />
  ),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const isAdminMock = vi.mocked(isAdmin);
const isEnterpriseAdminMock = vi.mocked(isEnterpriseAdmin);

describe("EnterpriseModulesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without create access when user is missing", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    render(await EnterpriseModulesPage());

    expect(screen.getByRole("heading", { name: "Module management" })).toBeInTheDocument();
    expect(screen.getByTestId("enterprise-module-manager")).toHaveAttribute("data-can-create", "0");
    expect(isEnterpriseAdminMock).not.toHaveBeenCalled();
    expect(isAdminMock).not.toHaveBeenCalled();
  });

  it("allows enterprise admins to create modules", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 1,
      email: "enterprise-admin@example.com",
      firstName: "Enterprise",
      lastName: "Admin",
      role: "ENTERPRISE_ADMIN",
      enterpriseName: "King's College London",
      isStaff: true,
      active: true,
    });
    isEnterpriseAdminMock.mockReturnValue(true);
    isAdminMock.mockReturnValue(false);

    render(await EnterpriseModulesPage());

    const manager = screen.getByTestId("enterprise-module-manager");
    expect(manager).toHaveAttribute("data-can-create", "1");
    expect(manager).toHaveAttribute("data-enterprise-name", "King's College London");
    expect(isEnterpriseAdminMock).toHaveBeenCalledTimes(1);
    expect(isAdminMock).not.toHaveBeenCalled();
  });

  it("allows admins when enterprise-admin check is false", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 2,
      email: "admin@example.com",
      firstName: "Global",
      lastName: "Admin",
      role: "ADMIN",
      enterpriseName: "KCL",
      isStaff: true,
      active: true,
    });
    isEnterpriseAdminMock.mockReturnValue(false);
    isAdminMock.mockReturnValue(true);

    render(await EnterpriseModulesPage());

    expect(screen.getByTestId("enterprise-module-manager")).toHaveAttribute("data-can-create", "1");
    expect(isEnterpriseAdminMock).toHaveBeenCalledTimes(1);
    expect(isAdminMock).toHaveBeenCalledTimes(1);
  });
});
