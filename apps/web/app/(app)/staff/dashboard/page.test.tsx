import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { listModules } from "@/features/modules/api/client";
import StaffDashboardPage from "./page";

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

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ title, children }: { title: string; children: ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock("@/shared/ui/Placeholder", () => ({
  Placeholder: ({ title, description }: { title: string; description: string }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  ),
}));

vi.mock("@/shared/ui/Table", () => ({
  Table: ({ headers, rows }: { headers: string[]; rows: Array<[string, ReactNode, string, string]> }) => (
    <div data-testid="table">
      <div>{headers.join("|")}</div>
      {rows.map((row, index) => (
        <div key={index} data-testid={`row-${index}`}>
          <span>{row[0]}</span>
          {row[1]}
          <span>{row[2]}</span>
          <span>{row[3]}</span>
        </div>
      ))}
    </div>
  ),
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const listModulesMock = vi.mocked(listModules);

describe("StaffDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects users without staff/admin access", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, isStaff: false, role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(StaffDashboardPage()).rejects.toBeInstanceOf(RedirectSentinel);
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("shows module loading error when API fails", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 2, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    listModulesMock.mockRejectedValue(new Error("modules unavailable"));

    const page = await StaffDashboardPage();
    render(page);

    expect(listModulesMock).toHaveBeenCalledWith(2, { scope: "staff" });
    expect(screen.getByText("Could not load your modules right now. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /my modules/i })).toHaveAttribute("href", "/staff/modules");
    expect(screen.queryByRole("link", { name: /analytics/i })).not.toBeInTheDocument();
  });

  it("shows empty-module state when no modules are assigned", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 3, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    listModulesMock.mockResolvedValue([] as Awaited<ReturnType<typeof listModules>>);

    const page = await StaffDashboardPage();
    render(page);

    expect(screen.getByText("No modules are currently assigned to your account.")).toBeInTheDocument();
    expect(screen.queryByTestId("table")).not.toBeInTheDocument();
  });

  it("renders module table rows with computed code and pluralized counts", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 4, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>);
    listModulesMock.mockResolvedValue([
      { id: "10", title: "Cloud Engineering", teamCount: 1, projectCount: 2 },
      { id: "CSX", title: "Research Module", teamCount: 3, projectCount: 1 },
    ] as Awaited<ReturnType<typeof listModules>>);

    const page = await StaffDashboardPage();
    render(page);

    expect(screen.getByTestId("table")).toBeInTheDocument();
    expect(screen.getByTestId("row-0")).toHaveTextContent("MOD-10");
    expect(screen.getByTestId("row-0")).toHaveTextContent("1 team");
    expect(screen.getByTestId("row-0")).toHaveTextContent("2 projects");
    expect(screen.getByTestId("row-1")).toHaveTextContent("CSX");
    expect(screen.getByTestId("row-1")).toHaveTextContent("3 teams");
    expect(screen.getByTestId("row-1")).toHaveTextContent("1 project");
  });
});
