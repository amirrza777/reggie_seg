import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getStaffProjectsForMarking } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import StaffMarksPage from "./page";

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

vi.mock("@/features/projects/api/client", () => ({
  getStaffProjectsForMarking: vi.fn(),
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
      aria-label="Search projects or teams"
    />
  ),
}));

const redirectMock = vi.mocked(redirect);
const getCurrentUserMock = vi.mocked(getCurrentUser);
const getStaffProjectsForMarkingMock = vi.mocked(getStaffProjectsForMarking);

const staffUser = { id: 9, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>;

describe("StaffMarksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthorized users", async () => {
    getCurrentUserMock.mockResolvedValue({ id: 1, isStaff: false, role: "STUDENT" } as Awaited<ReturnType<typeof getCurrentUser>>);

    await expect(StaffMarksPage({})).rejects.toBeInstanceOf(RedirectSentinel);
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders API load error", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectsForMarkingMock.mockRejectedValue(new Error("nope"));

    const page = await StaffMarksPage({ searchParams: Promise.resolve({ q: "Alpha" }) });
    render(page);

    expect(screen.getByText("Could not load projects right now. Please try again.")).toBeInTheDocument();
  });

  it("renders empty query message with clear control", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectsForMarkingMock.mockResolvedValue([] as Awaited<ReturnType<typeof getStaffProjectsForMarking>>);

    const page = await StaffMarksPage({ searchParams: Promise.resolve({ q: ["Ghost"] }) });
    render(page);

    expect(screen.getByText('No teams match "Ghost".')).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear" })).toHaveAttribute("href", "/staff/marks");
  });

  it("renders default empty state when no projects are assigned", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectsForMarkingMock.mockResolvedValue([] as Awaited<ReturnType<typeof getStaffProjectsForMarking>>);

    const page = await StaffMarksPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("No projects are assigned to your account.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("renders grouped projects and team links", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectsForMarkingMock.mockResolvedValue([
      {
        id: 2,
        name: "Beta Project",
        moduleId: 200,
        moduleName: "Module B",
        teams: [
          { id: 22, teamName: "Team Red", projectId: 2, inactivityFlag: "RED", studentCount: 3 },
          { id: 23, teamName: "Team Amber", projectId: 2, inactivityFlag: "YELLOW", studentCount: 2 },
        ],
      },
      {
        id: 1,
        name: "Alpha Project",
        moduleId: 100,
        moduleName: "Module A",
        teams: [],
      },
    ] as Awaited<ReturnType<typeof getStaffProjectsForMarking>>);

    const page = await StaffMarksPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(getStaffProjectsForMarkingMock).toHaveBeenCalledWith(9, { query: undefined });
    expect(screen.getByText("2 modules")).toBeInTheDocument();
    expect(screen.getByText("2 projects")).toBeInTheDocument();
    expect(screen.getAllByText("2 teams").length).toBeGreaterThan(0);
    expect(screen.getByText("No teams in this project yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Team Red/i })).toHaveAttribute("href", "/staff/projects/2/teams/22/grading");
    expect(screen.getByRole("link", { name: /Team Amber/i })).toHaveAttribute("href", "/staff/projects/2/teams/23/grading");
    expect(screen.getByText(/⚠ inactive/)).toBeInTheDocument();
    expect(screen.getByText(/⚡ low activity/)).toBeInTheDocument();
  });

  it("renders singular counters and student text without inactivity tag", async () => {
    getCurrentUserMock.mockResolvedValue(staffUser);
    getStaffProjectsForMarkingMock.mockResolvedValue([
      {
        id: 11,
        name: "Solo Project",
        moduleId: 777,
        moduleName: "Solo Module",
        teams: [{ id: 44, teamName: "Solo Team", projectId: 11, inactivityFlag: "NONE", studentCount: 1 }],
      },
    ] as Awaited<ReturnType<typeof getStaffProjectsForMarking>>);

    const page = await StaffMarksPage({});
    render(page);

    expect(getStaffProjectsForMarkingMock).toHaveBeenCalledWith(9, { query: undefined });
    expect(screen.getByText("1 module")).toBeInTheDocument();
    expect(screen.getByText("1 project")).toBeInTheDocument();
    expect(screen.getAllByText("1 team").length).toBeGreaterThan(0);
    expect(screen.getByText("1 project · 1 team")).toBeInTheDocument();
    expect(screen.getByText("1 student")).toBeInTheDocument();
    expect(screen.queryByText(/inactive|low activity/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Solo Team/i })).toHaveAttribute("href", "/staff/projects/11/teams/44/grading");
  });
});
