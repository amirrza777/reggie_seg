import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getProject,
  getProjectDeadline,
  getProjectMarking,
  getTeamByUserAndProject,
} from "@/features/projects/api/client";
import { resolveStudentProjectWorkspaceCapability } from "./resolveStudentProjectWorkspaceCapability";

vi.mock("@/features/projects/api/client", () => ({
  getTeamByUserAndProject: vi.fn(),
  getProject: vi.fn(),
  getProjectDeadline: vi.fn(),
  getProjectMarking: vi.fn(),
}));

const getTeamMock = vi.mocked(getTeamByUserAndProject);
const getProjectMock = vi.mocked(getProject);
const getProjectDeadlineMock = vi.mocked(getProjectDeadline);
const getProjectMarkingMock = vi.mocked(getProjectMarking);

const activeWindowDeadline = {
  taskOpenDate: "2020-01-01T00:00:00.000Z",
  taskDueDate: "2030-01-01T00:00:00.000Z",
  assessmentDueDate: null as string | null,
  feedbackDueDate: null as string | null,
};

describe("resolveStudentProjectWorkspaceCapability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProjectDeadlineMock.mockResolvedValue(activeWindowDeadline as Awaited<ReturnType<typeof getProjectDeadline>>);
    getProjectMarkingMock.mockResolvedValue(null as Awaited<ReturnType<typeof getProjectMarking>>);
  });

  it("returns empty capability when userId is missing or projectId is NaN", async () => {
    await expect(resolveStudentProjectWorkspaceCapability(undefined, 1)).resolves.toEqual({
      hasTeam: false,
      workspaceArchived: false,
      canEdit: false,
    });
    await expect(resolveStudentProjectWorkspaceCapability(1, Number.NaN)).resolves.toEqual({
      hasTeam: false,
      workspaceArchived: false,
      canEdit: false,
    });
  });

  it("sets canEdit when user has a team and workspace is not archived", async () => {
    getTeamMock.mockResolvedValue({ id: 1 } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectMock.mockResolvedValue({
      archivedAt: null,
      moduleArchivedAt: null,
    } as Awaited<ReturnType<typeof getProject>>);

    await expect(resolveStudentProjectWorkspaceCapability(9, 42)).resolves.toEqual({
      hasTeam: true,
      workspaceArchived: false,
      canEdit: true,
    });
  });

  it("treats module or project archive as read-only workspace", async () => {
    getTeamMock.mockResolvedValue({ id: 1 } as Awaited<ReturnType<typeof getTeamByUserAndProject>>);
    getProjectMock.mockResolvedValue({
      archivedAt: "2026-01-01",
      moduleArchivedAt: null,
    } as Awaited<ReturnType<typeof getProject>>);

    await expect(resolveStudentProjectWorkspaceCapability(9, 42)).resolves.toEqual({
      hasTeam: true,
      workspaceArchived: true,
      canEdit: false,
    });
  });

  it("swallows API errors and yields empty team or project", async () => {
    getTeamMock.mockRejectedValue(new Error("network"));
    getProjectMock.mockRejectedValue(new Error("network"));

    await expect(resolveStudentProjectWorkspaceCapability(9, 42)).resolves.toEqual({
      hasTeam: false,
      workspaceArchived: false,
      canEdit: false,
    });
  });
});
