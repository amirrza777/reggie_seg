import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import {
  createStaffProject,
  getProject,
  getProjectDeadline,
  getProjectMarking,
  getStaffProjectTeams,
  getTeamById,
  getTeamByUserAndProject,
  getTeammatesInProject,
  getUserProjects,
} from "./client";

describe("projects api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({});
  });

  it("gets one project", async () => {
    await getProject("42");
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42");
  });

  it("gets user projects", async () => {
    await getUserProjects(7);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects?userId=7");
  });

  it("unwraps deadline response", async () => {
    const deadline = {
      taskOpenDate: null,
      taskDueDate: null,
      assessmentOpenDate: null,
      assessmentDueDate: null,
      feedbackOpenDate: null,
      feedbackDueDate: null,
      isOverridden: false,
    };
    apiFetchMock.mockResolvedValue({ deadline });

    const result = await getProjectDeadline(7, 42);

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/deadline?userId=7");
    expect(result).toEqual(deadline);
  });

  it("gets teammates in project", async () => {
    await getTeammatesInProject(7, 42);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/teammates?userId=7");
  });

  it("gets team by id", async () => {
    await getTeamById(8);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/teams/8");
  });

  it("gets team by user and project", async () => {
    await getTeamByUserAndProject(7, 42);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/team?userId=7", {
      cache: "no-store",
    });
  });

  it("gets staff project teams without cache", async () => {
    await getStaffProjectTeams(7, 42);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/teams?userId=7", {
      cache: "no-store",
    });
  });

  it("gets project marking for the current user", async () => {
    await getProjectMarking(7, 42);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/marking?userId=7", {
      cache: "no-store",
    });
  });

  it("creates a staff project", async () => {
    const deadline = {
      taskOpenDate: "2026-03-01T09:00:00.000Z",
      taskDueDate: "2026-03-08T17:00:00.000Z",
      assessmentOpenDate: "2026-03-09T09:00:00.000Z",
      assessmentDueDate: "2026-03-12T17:00:00.000Z",
      feedbackOpenDate: "2026-03-13T09:00:00.000Z",
      feedbackDueDate: "2026-03-16T17:00:00.000Z",
    };

    await createStaffProject({
      name: "Project A",
      moduleId: 2,
      questionnaireTemplateId: 9,
      deadline,
    });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects", {
      method: "POST",
      body: JSON.stringify({
        name: "Project A",
        moduleId: 2,
        questionnaireTemplateId: 9,
        deadline,
      }),
    });
  });
});
