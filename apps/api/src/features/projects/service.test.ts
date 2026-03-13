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
}));

describe("projects service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates createProject and fetchProjectById", async () => {
    (repo.createProject as any).mockResolvedValue({ id: 9 });
    (repo.getProjectById as any).mockResolvedValue({ id: 9 });

    await expect(createProject("P1", 2, 3, [4])).resolves.toEqual({ id: 9 });
    expect(repo.createProject).toHaveBeenCalledWith("P1", 2, 3, [4]);

    await expect(fetchProjectById(9)).resolves.toEqual({ id: 9 });
    expect(repo.getProjectById).toHaveBeenCalledWith(9);
  });

  it("maps user projects to API shape with fallback module name", async () => {
    (repo.getUserProjects as any).mockResolvedValue([
      { id: 1, name: "A", module: { name: "SEGP" } },
      { id: 2, name: "B", module: null },
    ]);

    await expect(fetchProjectsForUser(7)).resolves.toEqual([
      { id: 1, name: "A", moduleName: "SEGP" },
      { id: 2, name: "B", moduleName: "" },
    ]);
  });

  it("maps modules and forwards module scope options", async () => {
    (repo.getModulesForUser as any).mockResolvedValue([
      {
        id: 9,
        name: "SEGP",
        briefText: null,
        timelineText: "Timeline",
        expectationsText: null,
        readinessNotesText: null,
        teamCount: 5,
        projectCount: 2,
        accessRole: "OWNER",
      },
    ]);

    await expect(fetchModulesForUser(7, { staffOnly: true })).resolves.toEqual([
      {
        id: "9",
        title: "SEGP",
        briefText: undefined,
        timelineText: "Timeline",
        expectationsText: undefined,
        readinessNotesText: undefined,
        teamCount: 5,
        projectCount: 2,
        accountRole: "OWNER",
      },
    ]);

    expect(repo.getModulesForUser).toHaveBeenCalledWith(7, { staffOnly: true });
  });

  it("delegates teammates, deadlines, team and questions fetchers", async () => {
    (repo.getTeammatesInProject as any).mockResolvedValue([{ userId: 4 }]);
    (repo.getUserProjectDeadline as any).mockResolvedValue({ taskDueDate: "2026-03-01" });
    (repo.getTeamById as any).mockResolvedValue({ id: 3 });
    (repo.getTeamByUserAndProject as any).mockResolvedValue({ id: 3 });
    (repo.getQuestionsForProject as any).mockResolvedValue({ questionnaireTemplate: { id: 8 } });

    await expect(fetchTeammatesForProject(1, 2)).resolves.toEqual([{ userId: 4 }]);
    await expect(fetchProjectDeadline(1, 2)).resolves.toEqual({ taskDueDate: "2026-03-01" });
    await expect(fetchTeamById(3)).resolves.toEqual({ id: 3 });
    await expect(fetchTeamByUserAndProject(1, 2)).resolves.toEqual({ id: 3 });
    await expect(fetchQuestionsForProject(2)).resolves.toEqual({ questionnaireTemplate: { id: 8 } });
  });
});
