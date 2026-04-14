import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProject, getTeamByUserAndProject } from "@/features/projects/api/client";
import { getCurrentUser } from "@/shared/auth/session";
import { redirectOnUnauthorized } from "@/shared/auth/redirectOnUnauthorized";
import ProjectReposPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getProject: vi.fn(),
  getTeamByUserAndProject: vi.fn(),
}));

vi.mock("@/shared/auth/redirectOnUnauthorized", () => ({
  redirectOnUnauthorized: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/shared/ui/PageSection", () => ({
  PageSection: ({
    title,
    className,
    children,
  }: {
    title: string;
    className?: string;
    children: ReactNode;
  }) => (
    <section data-testid="page-section" data-title={title} data-class-name={className}>
      {children}
    </section>
  ),
}));

vi.mock("@/features/projects/components/CustomAllocationWaitingBoard", () => ({
  CustomAllocationWaitingBoard: ({ projectId }: { projectId: string }) => (
    <div data-testid="waiting-board" data-project-id={projectId} />
  ),
}));

vi.mock("@/features/github/components/repos/GithubProjectReposClient", () => ({
  GithubProjectReposClient: ({ projectId }: { projectId: string }) => (
    <div data-testid="repos-client" data-project-id={projectId} />
  ),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getTeamByUserAndProjectMock = vi.mocked(getTeamByUserAndProject);
const getProjectMock = vi.mocked(getProject);
const redirectOnUnauthorizedMock = vi.mocked(redirectOnUnauthorized);

describe("ProjectReposPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 4 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 20 } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectMock.mockResolvedValue({
      id: "3",
      teamAllocationQuestionnaireTemplateId: null,
    } as Awaited<ReturnType<typeof getProject>>);
  });

  it("renders sign-in prompt when user is missing", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);

    const page = await ProjectReposPage({ params: Promise.resolve({ projectId: "3" }) });
    render(page);

    expect(screen.getByText("Please sign in to view repository details for this project.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to login" })).toHaveAttribute("href", "/login");
    expect(screen.queryByTestId("repos-client")).not.toBeInTheDocument();
  });

  it("renders waiting board when team is missing and allocation is custom", async () => {
    getTeamByUserAndProjectMock.mockResolvedValueOnce(null);
    getProjectMock.mockResolvedValueOnce({
      id: "3",
      teamAllocationQuestionnaireTemplateId: 99,
    } as Awaited<ReturnType<typeof getProject>>);

    const page = await ProjectReposPage({ params: Promise.resolve({ projectId: "3" }) });
    render(page);

    expect(screen.getByTestId("waiting-board")).toHaveAttribute("data-project-id", "3");
    expect(screen.queryByTestId("repos-client")).not.toBeInTheDocument();
  });

  it("renders repos client when user has a team", async () => {
    const page = await ProjectReposPage({ params: Promise.resolve({ projectId: "3" }) });
    render(page);

    expect(screen.getByTestId("repos-client")).toHaveAttribute("data-project-id", "3");
  });

  it("calls unauthorized redirect helper when team lookup fails", async () => {
    getTeamByUserAndProjectMock.mockRejectedValueOnce(new Error("team lookup failed"));

    const page = await ProjectReposPage({ params: Promise.resolve({ projectId: "3" }) });
    render(page);

    expect(redirectOnUnauthorizedMock).toHaveBeenCalled();
    expect(screen.getByTestId("repos-client")).toBeInTheDocument();
  });

  it("calls unauthorized redirect helper when project lookup fails", async () => {
    getTeamByUserAndProjectMock.mockResolvedValueOnce(null);
    getProjectMock.mockRejectedValueOnce(new Error("project lookup failed"));

    const page = await ProjectReposPage({ params: Promise.resolve({ projectId: "3" }) });
    render(page);

    expect(redirectOnUnauthorizedMock).toHaveBeenCalled();
    expect(screen.getByTestId("repos-client")).toBeInTheDocument();
  });
});
