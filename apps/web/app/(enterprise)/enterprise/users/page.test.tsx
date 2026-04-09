import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin, isEnterpriseAdmin } from "@/shared/auth/session";
import EnterpriseUsersPage from "./page";

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

vi.mock("@/features/enterprise/components/EnterpriseUserManagementPanel", () => ({
  EnterpriseUserManagementPanel: ({ currentUserId, currentUserRole }: { currentUserId: number; currentUserRole: string }) => (
    <div data-testid="enterprise-users-panel" data-user-id={String(currentUserId)} data-role={currentUserRole} />
  ),
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const isEnterpriseAdminMock = vi.mocked(isEnterpriseAdmin);
const isAdminMock = vi.mocked(isAdmin);

describe("EnterpriseUsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to login", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(EnterpriseUsersPage()).rejects.toMatchObject({ path: "/login" });
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects users without enterprise permissions", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 17, role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>);
    isEnterpriseAdminMock.mockReturnValue(false);
    isAdminMock.mockReturnValue(false);

    await expect(EnterpriseUsersPage()).rejects.toMatchObject({ path: "/enterprise/modules" });
    expect(redirectMock).toHaveBeenCalledWith("/enterprise/modules");
  });

  it("renders the enterprise users panel for enterprise admins", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 77, role: "ENTERPRISE_ADMIN" } as Awaited<ReturnType<typeof getCurrentUser>>);
    isEnterpriseAdminMock.mockReturnValue(true);
    isAdminMock.mockReturnValue(false);

    const page = await EnterpriseUsersPage();
    render(page);

    expect(screen.getByRole("heading", { level: 1, name: "People" })).toBeInTheDocument();
    expect(screen.getByTestId("enterprise-users-panel")).toHaveAttribute("data-user-id", "77");
    expect(screen.getByTestId("enterprise-users-panel")).toHaveAttribute("data-role", "ENTERPRISE_ADMIN");
  });
});
