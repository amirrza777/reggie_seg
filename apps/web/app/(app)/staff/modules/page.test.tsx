import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { listModules } from "@/features/modules/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import StaffModulesPage from "./page";

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
}));

vi.mock("@/features/modules/api/client", () => ({
  listModules: vi.fn(),
}));

vi.mock("@/features/modules/components/StaffModulesPageClient", () => ({
  StaffModulesPageClient: ({
    subtitle,
    errorMessage,
    modules,
  }: {
    subtitle: string;
    errorMessage: string | null;
    modules: Array<{ id: number; code: string }>;
  }) => (
    <section>
      <p data-testid="subtitle">{subtitle}</p>
      <p data-testid="error">{errorMessage ?? ""}</p>
      <p data-testid="module-count">{modules.length}</p>
    </section>
  ),
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const listModulesMock = vi.mocked(listModules);

const staffUser = { id: 42, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>;

describe("StaffModulesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects users without staff/admin access", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, isStaff: false, role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(StaffModulesPage()).rejects.toBeInstanceOf(RedirectSentinel);
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders the populated subtitle when modules are available", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    listModulesMock.mockResolvedValue([{ id: 10, code: "MOD101" }] as Awaited<ReturnType<typeof listModules>>);

    const page = await StaffModulesPage();
    render(page);

    expect(listModulesMock).toHaveBeenCalledWith(42, { scope: "staff" });
    expect(screen.getByTestId("subtitle")).toHaveTextContent("Open a module to review progress, and manage projects and teams.");
    expect(screen.getByTestId("error")).toHaveTextContent("");
    expect(screen.getByTestId("module-count")).toHaveTextContent("1");
  });

  it("renders empty-state subtitle when no modules are assigned", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    listModulesMock.mockResolvedValue([] as Awaited<ReturnType<typeof listModules>>);

    const page = await StaffModulesPage();
    render(page);

    expect(screen.getByTestId("subtitle")).toHaveTextContent("You have no modules assigned.");
    expect(screen.getByTestId("module-count")).toHaveTextContent("0");
  });

  it("renders error subtitle and message when loading fails", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    listModulesMock.mockRejectedValue(new Error("load failed"));

    const page = await StaffModulesPage();
    render(page);

    expect(screen.getByTestId("subtitle")).toHaveTextContent("Could not load your modules right now.");
    expect(screen.getByTestId("error")).toHaveTextContent("Could not load your modules right now. Please try again.");
    expect(screen.getByTestId("module-count")).toHaveTextContent("0");
  });
});
