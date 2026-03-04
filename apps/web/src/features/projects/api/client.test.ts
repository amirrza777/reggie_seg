import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import {
  getProject,
  getProjectDeadline,
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
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/team?userId=7");
  });
});
