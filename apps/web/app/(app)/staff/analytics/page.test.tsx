import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getStaffProjects } from "@/features/projects/api/client";
import { getCurrentUser, isElevatedStaff } from "@/shared/auth/session";
import StaffAnalyticsPage from "./page";

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
  isElevatedStaff: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getStaffProjects: vi.fn(),
}));

vi.mock("@/shared/ui/Card", () => ({
  Card: ({ title, children }: { title: string; children: ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const isElevatedStaffMock = vi.mocked(isElevatedStaff);
const getStaffProjectsMock = vi.mocked(getStaffProjects);

const staffUser = { id: 17, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>;

describe("StaffAnalyticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue(staffUser);
  });

  it("redirects users without elevated access", async () => {
    isElevatedStaffMock.mockReturnValue(false);

    await expect(StaffAnalyticsPage()).rejects.toBeInstanceOf(RedirectSentinel);
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders API error message", async () => {
    isElevatedStaffMock.mockReturnValue(true);
    getStaffProjectsMock.mockRejectedValue(new Error("analytics unavailable"));

    const page = await StaffAnalyticsPage();
    render(page);

    expect(screen.getByText("analytics unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Workspace summary" })).not.toBeInTheDocument();
  });

  it("renders empty-state card when no projects exist", async () => {
    isElevatedStaffMock.mockReturnValue(true);
    getStaffProjectsMock.mockResolvedValue([] as Awaited<ReturnType<typeof getStaffProjects>>);

    const page = await StaffAnalyticsPage();
    render(page);

    expect(screen.getByText("No analytics yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open modules" })).toHaveAttribute("href", "/staff/modules");
  });

  it("renders summary and priority metrics for loaded projects", async () => {
    isElevatedStaffMock.mockReturnValue(true);
    getStaffProjectsMock.mockResolvedValue([
      {
        id: 1,
        name: "Project One",
        moduleId: 100,
        teamCount: 2,
        membersTotal: 10,
        membersConnected: 8,
        hasGithubRepo: false,
        daysOld: 42,
      },
      {
        id: 2,
        name: "Project Two",
        moduleId: 101,
        teamCount: 0,
        membersTotal: 0,
        membersConnected: 0,
        hasGithubRepo: true,
        daysOld: 12,
      },
      {
        id: 3,
        name: "Project Three",
        moduleId: 100,
        teamCount: 1,
        membersTotal: 6,
        membersConnected: 1,
        hasGithubRepo: false,
        daysOld: 18,
      },
    ] as Awaited<ReturnType<typeof getStaffProjects>>);

    const page = await StaffAnalyticsPage();
    render(page);

    const metricValue = (label: string) => {
      const labelNode = screen.getByText(label);
      return labelNode.parentElement?.querySelector(".ui-metric-value")?.textContent;
    };

    expect(screen.getByRole("heading", { level: 2, name: "Workspace summary" })).toBeInTheDocument();
    expect(metricValue("Modules")).toBe("2");
    expect(metricValue("Projects")).toBe("3");
    expect(metricValue("Teams")).toBe("3");
    expect(metricValue("Students")).toBe("16");
    expect(metricValue("GitHub connected")).toBe("56%");
    expect(metricValue("Projects without repo")).toBe("2");
    expect(metricValue("Projects without teams")).toBe("1");
    expect(screen.getByRole("link", { name: "Repository analytics" })).toHaveAttribute("href", "/staff/repos");
    expect(screen.getByRole("link", { name: "Trello velocity" })).toHaveAttribute("href", "/staff/integrations");
  });
});
