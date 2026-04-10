import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getFeatureFlagMap } from "@/shared/featureFlags";
import { loadStaffProjectTeamsForPage } from "@/features/staff/projects/server/loadStaffProjectTeams";
import StaffProjectFeatureFlagsPage from "./page";

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

vi.mock("@/shared/featureFlags", () => ({
  getFeatureFlagMap: vi.fn(),
}));

vi.mock("@/features/staff/projects/server/loadStaffProjectTeams", () => ({
  loadStaffProjectTeamsForPage: vi.fn(),
}));

vi.mock("@/features/staff/projects/components/StaffProjectSectionNav", () => ({
  StaffProjectSectionNav: ({ projectId }: { projectId: number }) => (
    <div data-testid="staff-project-section-nav">{String(projectId)}</div>
  ),
}));

const navFlagsPanelMock = vi.fn((props: Record<string, unknown>) => (
  <div data-testid="nav-flags-panel" data-props={JSON.stringify(props)} />
));

vi.mock("@/features/staff/projects/components/StaffProjectNavFlagsPanel", () => ({
  StaffProjectNavFlagsPanel: (props: Record<string, unknown>) => navFlagsPanelMock(props),
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const getFeatureFlagMapMock = vi.mocked(getFeatureFlagMap);
const loadStaffProjectTeamsForPageMock = vi.mocked(loadStaffProjectTeamsForPage);

describe("StaffProjectFeatureFlagsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 7, role: "STAFF", isStaff: true } as any);
    getFeatureFlagMapMock.mockResolvedValue({ enterpriseFeatureX: true } as any);
    loadStaffProjectTeamsForPageMock.mockResolvedValue({
      status: "ok",
      numericProjectId: 12,
      data: {
        project: { id: 12, name: "Project Twelve", moduleId: 4 },
        teams: [],
      },
    } as any);
  });

  it("redirects non-staff users", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, role: "STUDENT", isStaff: false } as any);

    await expect(
      StaffProjectFeatureFlagsPage({ params: Promise.resolve({ projectId: "12" }) }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders invalid message for non-numeric project id", async () => {
    const page = await StaffProjectFeatureFlagsPage({ params: Promise.resolve({ projectId: "abc" }) });
    render(page);

    expect(screen.getByText("Invalid project ID.")).toBeInTheDocument();
    expect(loadStaffProjectTeamsForPageMock).not.toHaveBeenCalled();
  });

  it("renders invalid message when loader returns invalid_project_id", async () => {
    loadStaffProjectTeamsForPageMock.mockResolvedValue({ status: "invalid_project_id" } as any);

    const page = await StaffProjectFeatureFlagsPage({ params: Promise.resolve({ projectId: "12" }) });
    render(page);

    expect(screen.getByText("Invalid project ID.")).toBeInTheDocument();
  });

  it("renders loader error message", async () => {
    loadStaffProjectTeamsForPageMock.mockResolvedValue({
      status: "error",
      message: "Failed to load project team allocation data.",
    } as any);

    const page = await StaffProjectFeatureFlagsPage({ params: Promise.resolve({ projectId: "12" }) });
    render(page);

    expect(screen.getByText("Failed to load project team allocation data.")).toBeInTheDocument();
  });

  it("renders feature flags panel with project id and global flags", async () => {
    const page = await StaffProjectFeatureFlagsPage({ params: Promise.resolve({ projectId: "12" }) });
    render(page);

    expect(screen.getByTestId("staff-project-section-nav")).toHaveTextContent("12");
    expect(screen.getByRole("heading", { name: "Project Twelve" })).toBeInTheDocument();
    expect(navFlagsPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 12,
        globalFeatureFlags: { enterpriseFeatureX: true },
      }),
    );
  });

  it("allows admin user even when isStaff is false", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 2, role: "ADMIN", isStaff: false } as any);

    const page = await StaffProjectFeatureFlagsPage({ params: Promise.resolve({ projectId: "12" }) });
    render(page);

    expect(screen.getByTestId("nav-flags-panel")).toBeInTheDocument();
  });
});
