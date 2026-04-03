import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { listModules } from "@/features/modules/api/client";
import { ApiError } from "@/shared/api/errors";
import { getCurrentUser } from "@/shared/auth/session";
import StaffCreateProjectPage from "./page";

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

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/modules/api/client", () => ({
  listModules: vi.fn(),
}));

vi.mock("@/features/staff/projects/components/StaffProjectCreatePanel", () => ({
  StaffProjectCreatePanel: ({
    modules,
    modulesError,
    initialModuleId,
  }: {
    modules: Array<{ id: string; title: string }>;
    modulesError: string | null;
    initialModuleId: string | null;
  }) => (
    <div
      data-testid="create-panel"
      data-modules-count={String(modules.length)}
      data-modules-error={modulesError ?? ""}
      data-initial-module-id={initialModuleId ?? ""}
    />
  ),
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const listModulesMock = vi.mocked(listModules);

describe("StaffCreateProjectPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects users without staff/admin permissions", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, isStaff: false, role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(
      StaffCreateProjectPage({ searchParams: Promise.resolve({}) })
    ).rejects.toBeInstanceOf(RedirectSentinel);
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders selected-module breadcrumbs and panel props", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    listModulesMock.mockResolvedValue([
      { id: "MOD-1", title: "Module One" },
      { id: "MOD-2", title: "Module Two" },
    ] as Awaited<ReturnType<typeof listModules>>);

    const page = await StaffCreateProjectPage({ searchParams: Promise.resolve({ moduleId: "MOD-2" }) });
    render(page);

    expect(listModulesMock).toHaveBeenCalledWith(3, { scope: "staff", compact: true });
    expect(screen.getByTestId("create-panel")).toHaveAttribute("data-modules-count", "2");
    expect(screen.getByTestId("create-panel")).toHaveAttribute("data-initial-module-id", "MOD-2");
    expect(screen.getByRole("link", { name: "Module Two" })).toHaveAttribute("href", "/staff/modules/MOD-2");
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/staff/modules/MOD-2/projects");
    expect(screen.getByRole("link", { name: "Back to module" })).toHaveAttribute("href", "/staff/modules/MOD-2");
  });

  it("allows admin users and handles non-string moduleId values", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 8, isStaff: false, role: "ADMIN" } as Awaited<ReturnType<typeof getCurrentUser>>);
    listModulesMock.mockResolvedValue([{ id: "MOD-9", title: "Module Nine" }] as Awaited<ReturnType<typeof listModules>>);

    const page = await StaffCreateProjectPage({
      searchParams: Promise.resolve({ moduleId: 9 as unknown as string }),
    });
    render(page);

    expect(screen.getByTestId("create-panel")).toHaveAttribute("data-initial-module-id", "");
    expect(screen.getByRole("link", { name: "Back to my modules" })).toHaveAttribute("href", "/staff/modules");
  });

  it("shows session-expired error message when module API returns 401", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 12, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    listModulesMock.mockRejectedValue(new ApiError("expired", { status: 401 }));

    const page = await StaffCreateProjectPage({ searchParams: Promise.resolve({ moduleId: "MOD-3" }) });
    render(page);

    expect(screen.getByTestId("create-panel")).toHaveAttribute(
      "data-modules-error",
      "Your session has expired. Please sign in again."
    );
  });

  it("shows fallback module-loading message for unknown thrown values", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 15, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    listModulesMock.mockRejectedValue("bad");

    const page = await StaffCreateProjectPage({ searchParams: Promise.resolve({ moduleId: "MISSING" }) });
    render(page);

    expect(screen.getByTestId("create-panel")).toHaveAttribute(
      "data-modules-error",
      "Failed to load staff modules."
    );
  });
});
