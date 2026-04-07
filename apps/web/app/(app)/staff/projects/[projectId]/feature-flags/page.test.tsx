import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/shared/auth/session";
import { getFeatureFlagMap } from "@/shared/featureFlags";
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

const navFlagsPanelMock = vi.fn((props: Record<string, unknown>) => (
  <div data-testid="nav-flags-panel" data-props={JSON.stringify(props)} />
));

vi.mock("@/features/staff/projects/components/StaffProjectNavFlagsPanel", () => ({
  StaffProjectNavFlagsPanel: (props: Record<string, unknown>) => navFlagsPanelMock(props),
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const getFeatureFlagMapMock = vi.mocked(getFeatureFlagMap);

describe("StaffProjectFeatureFlagsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 7, role: "STAFF", isStaff: true } as any);
    getFeatureFlagMapMock.mockResolvedValue({ enterpriseFeatureX: true } as any);
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
  });

  it("renders feature flags panel with project id and global flags", async () => {
    const page = await StaffProjectFeatureFlagsPage({ params: Promise.resolve({ projectId: "12" }) });
    render(page);

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
