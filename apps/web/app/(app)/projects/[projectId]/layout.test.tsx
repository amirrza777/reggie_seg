import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProject } from "@/features/projects/api/client";
import { getProjectNavFlags } from "@/features/projects/navFlags";
import { resolveStudentProjectWorkspaceCapability } from "@/features/projects/lib/resolveStudentProjectWorkspaceCapability";
import { getCurrentUser } from "@/shared/auth/session";
import ProjectLayout from "./layout";

const breadcrumbsProps: Array<{ items: Array<{ label: string; href?: string }> }> = [];
const bannerProps: Array<Record<string, unknown>> = [];
const navProps: Array<Record<string, unknown>> = [];
const providerProps: Array<Record<string, unknown>> = [];

vi.mock("@/features/projects/api/client", () => ({
  getProject: vi.fn(),
}));

vi.mock("@/features/projects/navFlags", () => ({
  getProjectNavFlags: vi.fn(),
}));

vi.mock("@/features/projects/lib/resolveStudentProjectWorkspaceCapability", () => ({
  resolveStudentProjectWorkspaceCapability: vi.fn(),
}));

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/shared/layout/Breadcrumbs", () => ({
  Breadcrumbs: ({ items }: { items: Array<{ label: string; href?: string }> }) => {
    breadcrumbsProps.push({ items });
    return <div data-testid="breadcrumbs">{items.map((item) => item.label).join(" / ")}</div>;
  },
}));

vi.mock("@/features/modules/components/ArchivedProjectScopeBanner", () => ({
  ArchivedProjectScopeBanner: (props: Record<string, unknown>) => {
    bannerProps.push(props);
    return <div data-testid="archived-banner" />;
  },
}));

vi.mock("@/features/projects/components/ProjectNav", () => ({
  ProjectNav: (props: Record<string, unknown>) => {
    navProps.push(props);
    return <div data-testid="project-nav" />;
  },
}));

vi.mock("@/features/projects/workspace/ProjectWorkspaceCanEditContext", () => ({
  ProjectWorkspaceCanEditProvider: ({ value, children }: { value: unknown; children: React.ReactNode }) => {
    providerProps.push({ value });
    return <div data-testid="workspace-provider">{children}</div>;
  },
}));

const getProjectMock = vi.mocked(getProject);
const getProjectNavFlagsMock = vi.mocked(getProjectNavFlags);
const resolveWorkspaceCapabilityMock = vi.mocked(resolveStudentProjectWorkspaceCapability);
const getCurrentUserMock = vi.mocked(getCurrentUser);

describe("ProjectLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    breadcrumbsProps.length = 0;
    bannerProps.length = 0;
    navProps.length = 0;
    providerProps.length = 0;
  });

  it("loads project details and renders shell with resolved navigation and workspace capability", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 7, role: "STUDENT", isStaff: false } as Awaited<ReturnType<typeof getCurrentUser>>);
    getProjectNavFlagsMock.mockResolvedValue({ peer_feedback: true, repos: true } as Awaited<ReturnType<typeof getProjectNavFlags>>);
    resolveWorkspaceCapabilityMock.mockResolvedValue({
      canEdit: true,
    } as Awaited<ReturnType<typeof resolveStudentProjectWorkspaceCapability>>);
    getProjectMock.mockResolvedValue({
      name: "Project Atlas",
      moduleId: 17,
      moduleName: "Large-Scale Systems",
      moduleArchivedAt: "2025-01-01T00:00:00Z",
      archivedAt: null,
    } as Awaited<ReturnType<typeof getProject>>);

    const page = await ProjectLayout({
      params: Promise.resolve({ projectId: "42" }),
      children: <div data-testid="child">child content</div>,
    });

    render(page);

    expect(getProjectNavFlagsMock).toHaveBeenCalledWith(7, 42);
    expect(resolveWorkspaceCapabilityMock).toHaveBeenCalledWith(7, 42);
    expect(getProjectMock).toHaveBeenCalledWith("42");
    expect(screen.getByTestId("breadcrumbs")).toHaveTextContent("Large-Scale Systems / Projects / Project Atlas");
    expect(breadcrumbsProps.at(-1)?.items[0]).toEqual({
      label: "Large-Scale Systems",
      href: "/modules/17",
    });
    expect(screen.getByTestId("archived-banner")).toBeInTheDocument();
    expect(screen.getByTestId("project-nav")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-provider")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();

    expect(bannerProps.at(-1)).toMatchObject({
      moduleArchivedAt: "2025-01-01T00:00:00Z",
      projectArchivedAt: null,
      audience: "student",
      projectId: "42",
    });
    expect(navProps.at(-1)).toMatchObject({
      projectId: "42",
      enabledFlags: { peer_feedback: true, repos: true },
    });
    expect(providerProps.at(-1)).toMatchObject({
      value: { canEdit: true },
    });
  });

  it("falls back to generated project label when project fetch fails", async () => {
    getCurrentUserMock.mockResolvedValue(null as Awaited<ReturnType<typeof getCurrentUser>>);
    getProjectNavFlagsMock.mockResolvedValue({} as Awaited<ReturnType<typeof getProjectNavFlags>>);
    resolveWorkspaceCapabilityMock.mockResolvedValue(null as Awaited<ReturnType<typeof resolveStudentProjectWorkspaceCapability>>);
    getProjectMock.mockRejectedValue(new Error("not found"));

    const page = await ProjectLayout({
      params: Promise.resolve({ projectId: "77" }),
      children: <div>content</div>,
    });

    render(page);

    expect(getProjectNavFlagsMock).toHaveBeenCalledWith(undefined, 77);
    expect(resolveWorkspaceCapabilityMock).toHaveBeenCalledWith(undefined, 77);
    expect(screen.getByTestId("breadcrumbs")).toHaveTextContent("Projects / Project 77");
    expect(bannerProps.at(-1)).toMatchObject({
      audience: "student",
      projectId: "77",
    });
  });
});
