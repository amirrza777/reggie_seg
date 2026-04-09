import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getStaffProjects } from "@/features/projects/api/client";
import {
  loadStaffModuleWorkspaceContext,
  resolveStaffModuleWorkspaceAccess,
} from "@/features/modules/staffModuleWorkspaceLayoutData";
import StaffModuleProjectsPage from "./page";

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

vi.mock("@/features/projects/api/client", () => ({
  getStaffProjects: vi.fn(),
}));

vi.mock("@/features/modules/staffModuleWorkspaceLayoutData", () => ({
  loadStaffModuleWorkspaceContext: vi.fn(),
  resolveStaffModuleWorkspaceAccess: vi.fn(),
}));

vi.mock("@/features/staff/projects/components/StaffProjectsModuleList", () => ({
  ProjectCard: ({ project }: { project: { name: string } }) => <div data-testid="project-card">{project.name}</div>,
}));

vi.mock("@/shared/ui/SearchField", () => ({
  SearchField: ({ id, name, defaultValue, placeholder, className }: {
    id: string;
    name: string;
    defaultValue?: string;
    placeholder?: string;
    className?: string;
  }) => (
    <input
      id={id}
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={className}
      aria-label="Search projects"
    />
  ),
}));

const redirectMock = vi.mocked(redirect);
const getStaffProjectsMock = vi.mocked(getStaffProjects);
const resolveStaffModuleWorkspaceAccessMock = vi.mocked(resolveStaffModuleWorkspaceAccess);
const loadStaffModuleWorkspaceContextMock = vi.mocked(loadStaffModuleWorkspaceContext);

const workspaceContext = {
  parsedModuleId: 88,
  moduleId: "88",
  moduleRecord: { id: "88", title: "SEGP", accountRole: "OWNER" },
  module: { id: "88", title: "SEGP", accountRole: "OWNER" },
  isElevated: false,
  isEnterpriseAdmin: false,
  user: { id: 5, isStaff: true, role: "STAFF" },
} as Awaited<ReturnType<typeof loadStaffModuleWorkspaceContext>>;

describe("StaffModuleProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadStaffModuleWorkspaceContextMock.mockResolvedValue(workspaceContext);
    resolveStaffModuleWorkspaceAccessMock.mockReturnValue(
      { canCreateProject: true } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>,
    );
  });

  it("redirects to staff modules when context cannot be loaded", async () => {
    loadStaffModuleWorkspaceContextMock.mockResolvedValueOnce(null);

    await expect(
      StaffModuleProjectsPage({ params: Promise.resolve({ moduleId: "88" }) }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/staff/modules");
  });

  it("shows API error when project loading fails", async () => {
    getStaffProjectsMock.mockRejectedValueOnce(new Error("module projects failed"));

    const page = await StaffModuleProjectsPage({
      params: Promise.resolve({ moduleId: "88" }),
      searchParams: Promise.resolve({ q: "api" }),
    });
    render(page);

    expect(screen.getByText("module projects failed")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create project" })).not.toBeInTheDocument();
  });

  it("shows empty query state when no projects match", async () => {
    getStaffProjectsMock.mockResolvedValueOnce([] as Awaited<ReturnType<typeof getStaffProjects>>);

    const page = await StaffModuleProjectsPage({
      params: Promise.resolve({ moduleId: "88" }),
      searchParams: Promise.resolve({ q: "ghost" }),
    });
    render(page);

    expect(screen.getByText('No projects match "ghost".')).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear" })).toHaveAttribute("href", "/staff/modules/88/projects");
  });

  it("renders project cards and create-project controls", async () => {
    getStaffProjectsMock.mockResolvedValueOnce([
      { id: 2, name: "Zeta" },
      { id: 1, name: "Alpha" },
    ] as Awaited<ReturnType<typeof getStaffProjects>>);

    const page = await StaffModuleProjectsPage({ params: Promise.resolve({ moduleId: "88" }) });
    render(page);

    expect(getStaffProjectsMock).toHaveBeenCalledWith(5, { moduleId: 88, query: undefined });
    expect(screen.getByRole("link", { name: "Create project" })).toHaveAttribute(
      "href",
      "/staff/projects/create?moduleId=88",
    );
    const cards = screen.getAllByTestId("project-card");
    expect(cards[0]).toHaveTextContent("Alpha");
    expect(cards[1]).toHaveTextContent("Zeta");
  });

  it("hides create-project link and clear action when access is read-only and no query is set", async () => {
    resolveStaffModuleWorkspaceAccessMock.mockReturnValueOnce(
      { canCreateProject: false } as ReturnType<typeof resolveStaffModuleWorkspaceAccess>,
    );
    getStaffProjectsMock.mockResolvedValueOnce([] as Awaited<ReturnType<typeof getStaffProjects>>);

    const page = await StaffModuleProjectsPage({ params: Promise.resolve({ moduleId: "88" }) });
    render(page);

    expect(screen.getByText("No projects in this module yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create project" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Clear" })).not.toBeInTheDocument();
  });
});
