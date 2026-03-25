import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createProject,
  fetchModulesForUser,
  fetchProjectById,
  fetchProjectDeadline,
  fetchProjectsForUser,
  fetchQuestionsForProject,
  fetchTeamById,
  fetchTeamByUserAndProject,
  fetchTeammatesForProject,
  submitTeamHealthMessage,
  fetchMyTeamHealthMessages,
  fetchTeamHealthMessagesForStaff,
} from "./service.js";
import * as repo from "./repo.js";

vi.mock("./repo.js", () => ({
  getProjectById: vi.fn(),
  getUserProjects: vi.fn(),
  getModulesForUser: vi.fn(),
  createProject: vi.fn(),
  getTeammatesInProject: vi.fn(),
  getUserProjectDeadline: vi.fn(),
  getTeamById: vi.fn(),
  getTeamByUserAndProject: vi.fn(),
  getQuestionsForProject: vi.fn(),
  createTeamHealthMessage: vi.fn(),
  getTeamHealthMessagesForUserInProject: vi.fn(),
  getTeamHealthMessagesForTeamInProject: vi.fn(),
  canStaffAccessTeamInProject: vi.fn(),
}));

type RepoAsyncResult<T extends (...args: unknown[]) => Promise<unknown>> = Awaited<ReturnType<T>>;

const createProjectMock = vi.mocked(repo.createProject);
const getProjectByIdMock = vi.mocked(repo.getProjectById);
const getUserProjectsMock = vi.mocked(repo.getUserProjects);
const getModulesForUserMock = vi.mocked(repo.getModulesForUser);
const getTeammatesInProjectMock = vi.mocked(repo.getTeammatesInProject);
const getUserProjectDeadlineMock = vi.mocked(repo.getUserProjectDeadline);
const getTeamByIdMock = vi.mocked(repo.getTeamById);
const getTeamByUserAndProjectMock = vi.mocked(repo.getTeamByUserAndProject);
const getQuestionsForProjectMock = vi.mocked(repo.getQuestionsForProject);
const createTeamHealthMessageMock = vi.mocked(repo.createTeamHealthMessage);
const getTeamHealthMessagesForUserInProjectMock = vi.mocked(repo.getTeamHealthMessagesForUserInProject);
const getTeamHealthMessagesForTeamInProjectMock = vi.mocked(repo.getTeamHealthMessagesForTeamInProject);
const canStaffAccessTeamInProjectMock = vi.mocked(repo.canStaffAccessTeamInProject);

describe("projects service", () => {
  const deadlineInput = {
    taskOpenDate: new Date("2026-03-01T09:00:00.000Z"),
    taskDueDate: new Date("2026-03-08T17:00:00.000Z"),
    taskDueDateMcf: new Date("2026-03-15T17:00:00.000Z"),
    assessmentOpenDate: new Date("2026-03-09T09:00:00.000Z"),
    assessmentDueDate: new Date("2026-03-12T17:00:00.000Z"),
    assessmentDueDateMcf: new Date("2026-03-19T17:00:00.000Z"),
    feedbackOpenDate: new Date("2026-03-13T09:00:00.000Z"),
    feedbackDueDate: new Date("2026-03-16T17:00:00.000Z"),
    feedbackDueDateMcf: new Date("2026-03-23T17:00:00.000Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates createProject and fetchProjectById", async () => {
    createProjectMock.mockResolvedValue({ id: 9 } as RepoAsyncResult<typeof repo.createProject>);
    getProjectByIdMock.mockResolvedValue({ id: 9 } as RepoAsyncResult<typeof repo.getProjectById>);

    await expect(createProject(7, "P1", 2, 3, deadlineInput)).resolves.toEqual({ id: 9 });
    expect(repo.createProject).toHaveBeenCalledWith(7, "P1", 2, 3, deadlineInput);

    await expect(fetchProjectById(9)).resolves.toEqual({ id: 9 });
    expect(repo.getProjectById).toHaveBeenCalledWith(9);
  });

  it("maps user projects to API shape with fallback module name", async () => {
    getUserProjectsMock.mockResolvedValue([
      { id: 1, name: "A", module: { name: "SEGP" } },
      { id: 2, name: "B", module: null },
    ] as RepoAsyncResult<typeof repo.getUserProjects>);

    await expect(fetchProjectsForUser(7)).resolves.toEqual([
      { id: 1, name: "A", moduleName: "SEGP", archivedAt: null },
      { id: 2, name: "B", moduleName: "", archivedAt: null },
    ]);
  });

  it("fetchModulesForUser maps module fields to API shape", async () => {
    getModulesForUserMock.mockResolvedValue([
      {
        id: 9,
        name: "SEGP",
        briefText: null,
        timelineText: "Timeline",
        expectationsText: null,
        readinessNotesText: null,
        moduleLeadNames: ["Ada Lovelace"],
        teamCount: 5,
        projectCount: 2,
        accessRole: "OWNER",
      },
    ] as RepoAsyncResult<typeof repo.getModulesForUser>);

    await expect(fetchModulesForUser(7, { staffOnly: true, compact: true })).resolves.toEqual([
      {
        id: "9",
        title: "SEGP",
        briefText: undefined,
        timelineText: "Timeline",
        expectationsText: undefined,
        readinessNotesText: undefined,
        moduleLeadNames: ["Ada Lovelace"],
        teamCount: 5,
        projectCount: 2,
        accountRole: "OWNER",
      },
    ]);
  });

  it("fetchModulesForUser forwards module scope options to repo", async () => {
    getModulesForUserMock.mockResolvedValue([] as RepoAsyncResult<typeof repo.getModulesForUser>);
    await fetchModulesForUser(7, { staffOnly: true, compact: true });
    expect(repo.getModulesForUser).toHaveBeenCalledWith(7, { staffOnly: true, compact: true });
  });

  it("fetchModulesForUser always includes staffWithAccessCount for staff non-compact lists", async () => {
    (repo.getModulesForUser as any).mockResolvedValue([
      {
        id: 9,
        name: "SEGP",
        briefText: null,
        timelineText: null,
        expectationsText: null,
        readinessNotesText: null,
        teamCount: 1,
        projectCount: 1,
        accessRole: "OWNER",
      },
    ]);

    await expect(fetchModulesForUser(7, { staffOnly: true, compact: false })).resolves.toEqual([
      expect.objectContaining({
        id: "9",
        staffWithAccessCount: 0,
      }),
    ]);
  });

  it("delegates teammates, deadlines, team and questions fetchers", async () => {
    getTeammatesInProjectMock.mockResolvedValue([{ userId: 4 }] as RepoAsyncResult<typeof repo.getTeammatesInProject>);
    getUserProjectDeadlineMock.mockResolvedValue(
      { taskDueDate: "2026-03-01" } as RepoAsyncResult<typeof repo.getUserProjectDeadline>,
    );
    getTeamByIdMock.mockResolvedValue({ id: 3 } as RepoAsyncResult<typeof repo.getTeamById>);
    getTeamByUserAndProjectMock.mockResolvedValue(
      { id: 3 } as RepoAsyncResult<typeof repo.getTeamByUserAndProject>,
    );
    getQuestionsForProjectMock.mockResolvedValue(
      { questionnaireTemplate: { id: 8 } } as RepoAsyncResult<typeof repo.getQuestionsForProject>,
    );

    await expect(fetchTeammatesForProject(1, 2)).resolves.toEqual([{ userId: 4 }]);
    await expect(fetchProjectDeadline(1, 2)).resolves.toEqual({ taskDueDate: "2026-03-01" });
    await expect(fetchTeamById(3)).resolves.toEqual({ id: 3 });
    await expect(fetchTeamByUserAndProject(1, 2)).resolves.toEqual({ id: 3 });
    await expect(fetchQuestionsForProject(2)).resolves.toEqual({ questionnaireTemplate: { id: 8 } });
  });

  it("submitTeamHealthMessage validates membership and creates request", async () => {
    getTeamByUserAndProjectMock.mockResolvedValueOnce(null as RepoAsyncResult<typeof repo.getTeamByUserAndProject>);
    await expect(submitTeamHealthMessage(7, 3, "Need support", "Please review")).resolves.toBeNull();
    expect(repo.createTeamHealthMessage).not.toHaveBeenCalled();

    getTeamByUserAndProjectMock.mockResolvedValueOnce(
      { id: 22 } as RepoAsyncResult<typeof repo.getTeamByUserAndProject>,
    );
    createTeamHealthMessageMock.mockResolvedValue(
      { id: 101, resolved: false } as RepoAsyncResult<typeof repo.createTeamHealthMessage>,
    );
    await expect(submitTeamHealthMessage(7, 3, "Need support", "Please review")).resolves.toEqual({
      id: 101,
      resolved: false,
    });
    expect(repo.createTeamHealthMessage).toHaveBeenCalledWith(3, 22, 7, "Need support", "Please review");
  });

  it("fetchMyTeamHealthMessages requires membership and returns user requests", async () => {
    getTeamByUserAndProjectMock.mockResolvedValueOnce(null as RepoAsyncResult<typeof repo.getTeamByUserAndProject>);
    await expect(fetchMyTeamHealthMessages(7, 3)).resolves.toBeNull();
    expect(repo.getTeamHealthMessagesForUserInProject).not.toHaveBeenCalled();

    getTeamByUserAndProjectMock.mockResolvedValueOnce(
      { id: 22 } as RepoAsyncResult<typeof repo.getTeamByUserAndProject>,
    );
    getTeamHealthMessagesForUserInProjectMock.mockResolvedValue(
      [{ id: 1 }] as RepoAsyncResult<typeof repo.getTeamHealthMessagesForUserInProject>,
    );
    await expect(fetchMyTeamHealthMessages(7, 3)).resolves.toEqual([{ id: 1 }]);
    expect(repo.getTeamHealthMessagesForUserInProject).toHaveBeenCalledWith(3, 7);
  });

  it("fetchTeamHealthMessagesForStaff enforces staff scope before listing requests", async () => {
    canStaffAccessTeamInProjectMock.mockResolvedValueOnce(
      false as RepoAsyncResult<typeof repo.canStaffAccessTeamInProject>,
    );
    await expect(fetchTeamHealthMessagesForStaff(9, 3, 22)).resolves.toBeNull();
    expect(repo.getTeamHealthMessagesForTeamInProject).not.toHaveBeenCalled();

    canStaffAccessTeamInProjectMock.mockResolvedValueOnce(
      true as RepoAsyncResult<typeof repo.canStaffAccessTeamInProject>,
    );
    getTeamHealthMessagesForTeamInProjectMock.mockResolvedValue(
      [{ id: 4 }] as RepoAsyncResult<typeof repo.getTeamHealthMessagesForTeamInProject>,
    );
    await expect(fetchTeamHealthMessagesForStaff(9, 3, 22)).resolves.toEqual([{ id: 4 }]);
    expect(repo.getTeamHealthMessagesForTeamInProject).toHaveBeenCalledWith(3, 22);
  });
});
