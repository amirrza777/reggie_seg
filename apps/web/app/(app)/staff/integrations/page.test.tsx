import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getStaffProjectTeams, getStaffProjects } from "@/features/projects/api/client";
import { getCurrentUser, isElevatedStaff } from "@/shared/auth/session";
import StaffIntegrationsPage from "./page";

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
  default: ({ href, children, className, ...props }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className} {...props}>
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
  getStaffProjectTeams: vi.fn(),
}));

vi.mock("@/features/github/components/GithubProjectReposClient", () => ({
  GithubProjectReposClient: ({ projectId }: { projectId: string }) => <div data-testid="github-client">{projectId}</div>,
}));

vi.mock("@/features/staff/trello/StaffProjectTrelloContent", () => ({
  StaffProjectTrelloContent: ({
    projectId,
    teamId,
    teamName,
  }: {
    projectId: string;
    teamId: number;
    teamName: string;
  }) => (
    <div data-testid="trello-content">{`${projectId}:${teamId}:${teamName}`}</div>
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
const getCurrentUserMock = vi.mocked(getCurrentUser);
const isElevatedStaffMock = vi.mocked(isElevatedStaff);
const getStaffProjectsMock = vi.mocked(getStaffProjects);
const getStaffProjectTeamsMock = vi.mocked(getStaffProjectTeams);

const staffUser = { id: 42, isStaff: true, role: "STAFF" } as Awaited<ReturnType<typeof getCurrentUser>>;

describe("StaffIntegrationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue(staffUser);
  });

  it("redirects users without elevated staff access", async () => {
    isElevatedStaffMock.mockReturnValue(false);

    await expect(
      StaffIntegrationsPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("shows project load error and hides search form", async () => {
    isElevatedStaffMock.mockReturnValue(true);
    getStaffProjectsMock.mockRejectedValue(new Error("projects failed"));

    const page = await StaffIntegrationsPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("projects failed")).toBeInTheDocument();
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
  });

  it("shows default project load error for non-Error throws", async () => {
    isElevatedStaffMock.mockReturnValue(true);
    getStaffProjectsMock.mockRejectedValue("projects failed");

    const page = await StaffIntegrationsPage({
      searchParams: Promise.resolve({ projectId: ["10"], q: ["alpha"] }),
    });
    render(page);

    expect(screen.getByText("Failed to load your projects.")).toBeInTheDocument();
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
  });

  it("shows empty filtered state when no projects match query", async () => {
    isElevatedStaffMock.mockReturnValue(true);
    getStaffProjectsMock.mockResolvedValue([] as Awaited<ReturnType<typeof getStaffProjects>>);

    const page = await StaffIntegrationsPage({ searchParams: Promise.resolve({ q: "zzz" }) });
    render(page);

    expect(screen.getByText('No projects match "zzz".')).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear" })).toHaveAttribute("href", "/staff/integrations");
  });

  it("shows empty unfiltered state when no projects exist", async () => {
    isElevatedStaffMock.mockReturnValue(true);
    getStaffProjectsMock.mockResolvedValue([] as Awaited<ReturnType<typeof getStaffProjects>>);

    const page = await StaffIntegrationsPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByText("No projects are available for your account yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("renders github and trello sections when project/team data exists", async () => {
    isElevatedStaffMock.mockReturnValue(true);
    getStaffProjectsMock.mockResolvedValue([
      { id: 10, name: "Alpha", moduleName: "Module A" },
      { id: 20, name: "Beta", moduleName: "Module B" },
    ] as Awaited<ReturnType<typeof getStaffProjects>>);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 20, moduleId: 2, name: "Beta" },
      teams: [{ id: 77, teamName: "Team Orbit" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffIntegrationsPage({ searchParams: Promise.resolve({ projectId: "20", q: "be" }) });
    render(page);

    expect(screen.getByTestId("github-client")).toHaveTextContent("20");
    expect(screen.getByTestId("trello-content")).toHaveTextContent("20:77:Team Orbit");
    expect(screen.getByRole("link", { name: "Alpha" })).toHaveAttribute(
      "href",
      "/staff/integrations?projectId=10&q=be",
    );
  });

  it("builds tab links without q when no query is provided", async () => {
    isElevatedStaffMock.mockReturnValue(true);
    getStaffProjectsMock.mockResolvedValue([
      { id: 10, name: "Alpha", moduleName: "Module A" },
      { id: 20, name: "Beta", moduleName: "Module B" },
    ] as Awaited<ReturnType<typeof getStaffProjects>>);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 20, moduleId: 2, name: "Beta" },
      teams: [{ id: 88, teamName: "Team Orbit" }],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffIntegrationsPage({ searchParams: Promise.resolve({ projectId: "20" }) });
    render(page);

    expect(screen.getByRole("link", { name: "Alpha" })).toHaveAttribute("href", "/staff/integrations?projectId=10");
  });

  it("shows trello fallback when project has no teams", async () => {
    isElevatedStaffMock.mockReturnValue(true);
    getStaffProjectsMock.mockResolvedValue([
      { id: 30, name: "Gamma", moduleName: "Module C" },
    ] as Awaited<ReturnType<typeof getStaffProjects>>);
    getStaffProjectTeamsMock.mockResolvedValue({
      project: { id: 30, moduleId: 3, name: "Gamma" },
      teams: [],
    } as Awaited<ReturnType<typeof getStaffProjectTeams>>);

    const page = await StaffIntegrationsPage({ searchParams: Promise.resolve({ projectId: "30" }) });
    render(page);

    expect(screen.getByText(/Trello activity is shown per team/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open project teams" })).toHaveAttribute("href", "/staff/projects/30");
  });

  it("shows trello fallback when team lookup throws", async () => {
    isElevatedStaffMock.mockReturnValue(true);
    getStaffProjectsMock.mockResolvedValue([
      { id: 31, name: "Delta", moduleName: "Module D" },
    ] as Awaited<ReturnType<typeof getStaffProjects>>);
    getStaffProjectTeamsMock.mockRejectedValue(new Error("team fetch failed"));

    const page = await StaffIntegrationsPage({ searchParams: Promise.resolve({ projectId: "31" }) });
    render(page);

    expect(screen.getByText(/Trello activity is shown per team/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open project teams" })).toHaveAttribute("href", "/staff/projects/31");
  });

  it("handles non-numeric selected project ids without loading team data", async () => {
    isElevatedStaffMock.mockReturnValue(true);
    getStaffProjectsMock.mockResolvedValue([
      { id: Number.NaN, name: "Weird", moduleName: "Module Z" },
    ] as Awaited<ReturnType<typeof getStaffProjects>>);

    const page = await StaffIntegrationsPage({ searchParams: Promise.resolve({ projectId: "NaN" }) });
    render(page);

    expect(getStaffProjectTeamsMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Trello activity is shown per team/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open project teams" })).toHaveAttribute("href", "/staff/projects/NaN");
  });
});
