import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin, isEnterpriseAdmin } from "@/shared/auth/session";
import EnterpriseModuleCreatePage from "./page";

class RedirectSentinel extends Error {
  constructor(readonly path: string) {
    super(path);
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectSentinel(path);
  }),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
  isAdmin: vi.fn(),
  isEnterpriseAdmin: vi.fn(),
}));

vi.mock("@/shared/layout/Breadcrumbs", () => ({
  Breadcrumbs: ({ items }: { items: Array<{ label: string; href?: string }> }) => (
    <nav data-testid="breadcrumbs">{items.map((item) => item.label).join(" > ")}</nav>
  ),
}));

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ title, children }: { title: string; children: ReactNode }) => (
    <section data-testid="card" data-title={title}>
      {children}
    </section>
  ),
}));

vi.mock("@/features/enterprise/components/module-create/EnterpriseModuleCreateForm", () => ({
  EnterpriseModuleCreateForm: () => <div data-testid="module-create-form" />,
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const isEnterpriseAdminMock = vi.mocked(isEnterpriseAdmin);
const isAdminMock = vi.mocked(isAdmin);

describe("EnterpriseModuleCreatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to login", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(EnterpriseModuleCreatePage()).rejects.toMatchObject({ path: "/login" });
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects non-admin users without enterprise admin access", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 12, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    isEnterpriseAdminMock.mockReturnValue(false);
    isAdminMock.mockReturnValue(false);

    await expect(EnterpriseModuleCreatePage()).rejects.toMatchObject({ path: "/enterprise/modules" });
    expect(redirectMock).toHaveBeenCalledWith("/enterprise/modules");
  });

  it("renders create module page for enterprise admins", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 99, role: "ENTERPRISE_ADMIN" } as Awaited<ReturnType<typeof getCurrentUser>>);
    isEnterpriseAdminMock.mockReturnValue(true);
    isAdminMock.mockReturnValue(false);

    const page = await EnterpriseModuleCreatePage();
    render(page);

    expect(screen.getByRole("heading", { level: 1, name: "Create module" })).toBeInTheDocument();
    expect(screen.getByTestId("breadcrumbs")).toHaveTextContent("Module management > Create module");
    expect(screen.getByTestId("card")).toHaveAttribute("data-title", "Module setup");
    expect(screen.getByTestId("module-create-form")).toBeInTheDocument();
  });
});
