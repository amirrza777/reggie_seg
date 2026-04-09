import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/shared/auth/session";
import {
  getMyTeamHealthMessages,
  getMyTeamWarnings,
  getProject,
  getTeamByUserAndProject,
} from "@/features/projects/api/client";
import ProjectTeamHealthPage from "./page";

vi.mock("@/shared/auth/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/features/projects/api/client", () => ({
  getMyTeamHealthMessages: vi.fn(),
  getMyTeamWarnings: vi.fn(),
  getProject: vi.fn(),
  getTeamByUserAndProject: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const projectTeamHealthPanelsMock = vi.fn((props: Record<string, unknown>) => (
  <div data-testid="team-health-panels" data-props={JSON.stringify(props)} />
));

vi.mock("@/features/projects/components/ProjectTeamHealthPanels", () => ({
  ProjectTeamHealthPanels: (props: Record<string, unknown>) => projectTeamHealthPanelsMock(props),
}));

vi.mock("@/features/projects/components/ProjectTeamHealthTitleWithInfo", () => ({
  ProjectTeamHealthTitleWithInfo: ({ title }: { title: string }) => <span>{title}</span>,
}));

vi.mock("@/features/projects/components/CustomAllocationWaitingBoard", () => ({
  CustomAllocationWaitingBoard: ({ projectId }: { projectId: string }) => (
    <div data-testid="custom-allocation-waiting" data-project-id={projectId} />
  ),
}));

vi.mock("@/shared/ui/PageSection", () => ({
  PageSection: ({ title, description, children }: { title: ReactNode; description?: string; children: ReactNode }) => (
    <section data-testid="page-section">
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  ),
}));

const getCurrentUserMock = vi.mocked(getCurrentUser);
const getProjectMock = vi.mocked(getProject);
const getTeamByUserAndProjectMock = vi.mocked(getTeamByUserAndProject);
const getMyTeamHealthMessagesMock = vi.mocked(getMyTeamHealthMessages);
const getMyTeamWarningsMock = vi.mocked(getMyTeamWarnings);

describe("ProjectTeamHealthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserMock.mockResolvedValue({ id: 12 } as Awaited<ReturnType<typeof getCurrentUser>>);
    getTeamByUserAndProjectMock.mockResolvedValue({ id: 9 } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectMock.mockResolvedValue({
      id: "19",
      name: "Health",
      teamAllocationQuestionnaireTemplateId: null,
    } as Awaited<ReturnType<typeof getProject>>);
    getMyTeamHealthMessagesMock.mockResolvedValue([] as Awaited<ReturnType<typeof getMyTeamHealthMessages>>);
    getMyTeamWarningsMock.mockResolvedValue([] as Awaited<ReturnType<typeof getMyTeamWarnings>>);
  });

  it("renders sign-in prompt when user is missing", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const page = await ProjectTeamHealthPage({ params: Promise.resolve({ projectId: "19" }) });
    render(page);

    expect(screen.getByText("Please sign in to submit a team health message.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to login" })).toHaveAttribute("href", "/login");
  });

  it("renders invalid project message for non numeric ids", async () => {
    const page = await ProjectTeamHealthPage({ params: Promise.resolve({ projectId: "abc" }) });
    render(page);

    expect(screen.getByText("Invalid project ID.")).toBeInTheDocument();
    expect(getTeamByUserAndProjectMock).not.toHaveBeenCalled();
  });

  it("renders custom-allocation waiting board when team is missing and project uses custom allocation", async () => {
    getTeamByUserAndProjectMock.mockResolvedValue(null);
    getProjectMock.mockResolvedValue({
      id: "19",
      name: "Health",
      teamAllocationQuestionnaireTemplateId: 77,
    } as Awaited<ReturnType<typeof getProject>>);

    const page = await ProjectTeamHealthPage({ params: Promise.resolve({ projectId: "19" }) });
    render(page);

    expect(screen.getByTestId("page-section")).toBeInTheDocument();
    expect(screen.getByTestId("custom-allocation-waiting")).toHaveAttribute("data-project-id", "19");
  });

  it("renders no-team message when team is missing without custom allocation", async () => {
    getTeamByUserAndProjectMock.mockRejectedValue(new Error("no team"));
    getProjectMock.mockRejectedValue(new Error("project load failed"));

    const page = await ProjectTeamHealthPage({ params: Promise.resolve({ projectId: "19" }) });
    render(page);

    expect(screen.getByText("You are not in a team for this project.")).toBeInTheDocument();
  });

  it("passes active warnings and loaded data to panel", async () => {
    getMyTeamHealthMessagesMock.mockResolvedValue([
      { id: 1, resolved: false },
    ] as Awaited<ReturnType<typeof getMyTeamHealthMessages>>);
    getMyTeamWarningsMock.mockResolvedValue([
      { id: 1, active: true },
      { id: 2, active: false },
    ] as Awaited<ReturnType<typeof getMyTeamWarnings>>);

    const page = await ProjectTeamHealthPage({ params: Promise.resolve({ projectId: "19" }) });
    render(page);

    expect(screen.getByTestId("page-section")).toBeInTheDocument();
    expect(projectTeamHealthPanelsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 19,
        userId: 12,
        initialRequests: [{ id: 1, resolved: false }],
        activeWarnings: [{ id: 1, active: true }],
        messagesLoadError: null,
        warningsLoadError: null,
      }),
    );
  });

  it("surfaces fallback load errors when messages and warnings fail", async () => {
    getMyTeamHealthMessagesMock.mockRejectedValue("messages failed");
    getMyTeamWarningsMock.mockRejectedValue("warnings failed");

    const page = await ProjectTeamHealthPage({ params: Promise.resolve({ projectId: "19" }) });
    render(page);

    expect(projectTeamHealthPanelsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        initialRequests: [],
        activeWarnings: [],
        messagesLoadError: "Failed to load existing team health messages.",
        warningsLoadError: "Failed to load team warnings.",
      }),
    );
  });

  it("surfaces thrown error messages when messages and warnings reject with Error", async () => {
    getMyTeamHealthMessagesMock.mockRejectedValue(new Error("messages exploded"));
    getMyTeamWarningsMock.mockRejectedValue(new Error("warnings exploded"));

    const page = await ProjectTeamHealthPage({ params: Promise.resolve({ projectId: "19" }) });
    render(page);

    expect(projectTeamHealthPanelsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messagesLoadError: "messages exploded",
        warningsLoadError: "warnings exploded",
      }),
    );
  });
});
