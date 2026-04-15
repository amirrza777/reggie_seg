import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/shared/auth/session";
import AdminEnterprisesPage from "./page";

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
}));

vi.mock("@/features/admin/components/EnterpriseManagementTable", () => ({
  EnterpriseManagementTable: ({ isSuperAdmin }: { isSuperAdmin?: boolean }) => (
    <div data-testid="enterprise-management-table" data-super-admin={isSuperAdmin ? "1" : "0"} />
  ),
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const isAdminMock = vi.mocked(isAdmin);

describe("AdminEnterprisesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAdminMock.mockReturnValue(false);
  });

  it("redirects unauthenticated users to /admin", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(AdminEnterprisesPage()).rejects.toMatchObject({ path: "/admin" });
    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });

  it("redirects non-admin users to /admin", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 11,
      email: "staff@example.com",
      role: "STAFF",
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    isAdminMock.mockReturnValue(false);

    await expect(AdminEnterprisesPage()).rejects.toMatchObject({ path: "/admin" });
    expect(redirectMock).toHaveBeenCalledWith("/admin");
  });

  it("renders enterprises management for admin users", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: 1,
      email: "admin+ops@example.com",
      role: "ADMIN",
    } as Awaited<ReturnType<typeof getCurrentUser>>);
    isAdminMock.mockReturnValue(true);

    const page = await AdminEnterprisesPage();
    render(page);

    expect(screen.getByRole("heading", { level: 1, name: "Enterprises" })).toBeInTheDocument();
    expect(screen.getByTestId("enterprise-management-table")).toHaveAttribute("data-super-admin", "1");
  });
});
