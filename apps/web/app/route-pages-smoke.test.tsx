import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

class RedirectSentinel extends Error {
  path: string;
  constructor(path: string) {
    super(`redirect:${path}`);
    this.path = path;
  }
}

const redirectMock = vi.fn((path: string) => {
  throw new RedirectSentinel(path);
});

const getCurrentUserMock = vi.fn();
const isAdminMock = vi.fn();
const isEnterpriseAdminMock = vi.fn();
const listModulesMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: () => getCurrentUserMock(),
  isAdmin: (user: unknown) => isAdminMock(user),
  isEnterpriseAdmin: (user: unknown) => isEnterpriseAdminMock(user),
}));

vi.mock("@/features/modules/api/client", () => ({
  listModules: (...args: unknown[]) => listModulesMock(...args),
}));

vi.mock("@/features/enterprise/components/EnterpriseOverviewSummary", () => ({
  EnterpriseOverviewSummary: () => <div data-testid="enterprise-overview-summary" />,
}));
vi.mock("@/features/enterprise/components/EnterpriseModuleManager", () => ({
  EnterpriseModuleManager: ({ canCreateModule }: { canCreateModule: boolean }) => (
    <div data-testid="enterprise-module-manager">{String(canCreateModule)}</div>
  ),
}));
vi.mock("@/features/enterprise/components/EnterpriseFeatureFlagsCard", () => ({
  EnterpriseFeatureFlagsCard: () => <div data-testid="enterprise-feature-flags-card" />,
}));
vi.mock("@/features/enterprise/reports/components/ForumReportsTable", () => ({
  ForumReportsTable: () => <div data-testid="enterprise-forum-reports-table" />,
}));
vi.mock("@/features/enterprise/components/EnterpriseModuleCreateForm", () => ({
  EnterpriseModuleCreateForm: () => <div data-testid="enterprise-module-create-form" />,
}));
vi.mock("@/features/admin/components/EnterpriseManagementTable", () => ({
  EnterpriseManagementTable: ({ isSuperAdmin }: { isSuperAdmin?: boolean }) => (
    <div data-testid="enterprise-management-table">{String(Boolean(isSuperAdmin))}</div>
  ),
}));
vi.mock("@/features/modules/components/StaffModulesPageClient", () => ({
  StaffModulesPageClient: ({
    modules,
    subtitle,
    errorMessage,
  }: {
    modules: Array<{ id: number }>;
    subtitle: string;
    errorMessage: string | null;
  }) => (
    <div data-testid="staff-modules-page">
      <span data-testid="modules-count">{modules.length}</span>
      <span data-testid="modules-subtitle">{subtitle}</span>
      <span data-testid="modules-error">{errorMessage ?? ""}</span>
    </div>
  ),
}));

import EnterpriseHomePage from "./(enterprise)/enterprise/page";
import EnterpriseGroupsPage from "./(enterprise)/enterprise/groups/page";
import EnterpriseModulesPage from "./(enterprise)/enterprise/modules/page";
import EnterpriseFeatureFlagsPage from "./(enterprise)/enterprise/feature-flags/page";
import EnterpriseForumReportsPage from "./(enterprise)/enterprise/forum-reports/page";
import EnterpriseModuleCreatePage from "./(enterprise)/enterprise/modules/create/page";
import AdminEnterprisesPage from "./(admin)/admin/enterprises/page";
import StaffModulesPage from "./(app)/staff/modules/page";
import NotFoundPage from "./not-found";

describe("route pages smoke tests", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    getCurrentUserMock.mockReset();
    isAdminMock.mockReset();
    isEnterpriseAdminMock.mockReset();
    listModulesMock.mockReset();
  });

  it("renders enterprise home and groups pages", () => {
    render(<EnterpriseHomePage />);
    expect(screen.getByText("Enterprise overview")).toBeInTheDocument();
    expect(screen.getByTestId("enterprise-overview-summary")).toBeInTheDocument();

    render(<EnterpriseGroupsPage />);
    expect(screen.getByText("Group management")).toBeInTheDocument();
  });

  it("renders enterprise modules page and computes create permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, role: "ENTERPRISE_ADMIN" });
    isEnterpriseAdminMock.mockReturnValue(true);
    isAdminMock.mockReturnValue(false);

    const view = await EnterpriseModulesPage();
    render(view);
    expect(screen.getByText("Module management")).toBeInTheDocument();
    expect(screen.getByTestId("enterprise-module-manager")).toHaveTextContent("true");
  });

  it("redirects unauthorised enterprise feature-flags users", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 2, role: "STUDENT" });
    isEnterpriseAdminMock.mockReturnValue(false);
    isAdminMock.mockReturnValue(false);

    await expect(EnterpriseFeatureFlagsPage()).rejects.toMatchObject({ path: "/enterprise/modules" });
  });

  it("renders enterprise feature-flags page for allowed users", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3, role: "ENTERPRISE_ADMIN" });
    isEnterpriseAdminMock.mockReturnValue(true);
    isAdminMock.mockReturnValue(false);

    const view = await EnterpriseFeatureFlagsPage();
    render(view);
    expect(screen.getByText("Enterprise feature flags")).toBeInTheDocument();
    expect(screen.getByTestId("enterprise-feature-flags-card")).toBeInTheDocument();
  });

  it("renders enterprise forum-reports page", () => {
    render(<EnterpriseForumReportsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Forum reports" })).toBeInTheDocument();
    expect(screen.getByTestId("enterprise-forum-reports-table")).toBeInTheDocument();
  });

  it("redirects enterprise module-create page when unauthenticated", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    await expect(EnterpriseModuleCreatePage()).rejects.toMatchObject({ path: "/login" });
  });

  it("redirects enterprise module-create page when user lacks admin rights", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 4, role: "STAFF" });
    isEnterpriseAdminMock.mockReturnValue(false);
    isAdminMock.mockReturnValue(false);
    await expect(EnterpriseModuleCreatePage()).rejects.toMatchObject({ path: "/enterprise/modules" });
  });

  it("renders enterprise module-create page for admins", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 5, role: "ADMIN" });
    isEnterpriseAdminMock.mockReturnValue(false);
    isAdminMock.mockReturnValue(true);

    const view = await EnterpriseModuleCreatePage();
    render(view);
    expect(screen.getByRole("heading", { level: 1, name: "Create module" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Module management" })).toHaveAttribute("href", "/enterprise/modules");
    expect(screen.getByTestId("enterprise-module-create-form")).toBeInTheDocument();
  });

  it("redirects non-super-admin users from admin enterprises page", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 6, email: "staff@kcl.ac.uk" });
    await expect(AdminEnterprisesPage()).rejects.toMatchObject({ path: "/admin" });
  });

  it("renders admin enterprises page for super admin email", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7, email: "admin@kcl.ac.uk" });
    const view = await AdminEnterprisesPage();
    render(view);
    expect(screen.getByTestId("enterprise-management-table")).toHaveTextContent("true");
  });

  it("redirects unauthorised users from staff modules page", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 8, isStaff: false, role: "STUDENT" });
    await expect(StaffModulesPage()).rejects.toMatchObject({ path: "/dashboard" });
  });

  it("renders staff modules page and handles fetch errors", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 9, isStaff: true, role: "STAFF" });
    listModulesMock.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    let view = await StaffModulesPage();
    const { rerender } = render(view);
    expect(screen.getByTestId("modules-count")).toHaveTextContent("2");

    listModulesMock.mockRejectedValueOnce(new Error("boom"));
    view = await StaffModulesPage();
    rerender(view);
    expect(screen.getByTestId("modules-error")).toHaveTextContent(
      "Could not load your modules right now. Please try again.",
    );
  });

  it("renders not-found page for signed-in and signed-out users", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    let view = await NotFoundPage();
    const { rerender } = render(view);
    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");

    getCurrentUserMock.mockResolvedValue({ id: 10 });
    view = await NotFoundPage();
    rerender(view);
    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/dashboard");
  });
});
