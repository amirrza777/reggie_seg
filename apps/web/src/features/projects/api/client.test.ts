import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import {
  createMcfRequest,
  getMyMcfRequests,
  getStaffTeamMcfRequests,
  getProject,
  getProjectDeadline,
  getProjectMarking,
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

  it("gets project marking for the current user", async () => {
    await getProjectMarking(7, 42);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/marking?userId=7", {
      cache: "no-store",
    });
  });

  it("creates an MCF request", async () => {
    const request = { id: 1, status: "OPEN" };
    apiFetchMock.mockResolvedValue({ request });

    const result = await createMcfRequest(42, 7, "Need help", "Something happened");

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/mcf-requests", {
      method: "POST",
      body: JSON.stringify({ userId: 7, subject: "Need help", details: "Something happened" }),
    });
    expect(result).toEqual(request);
  });

  it("gets current user's MCF requests", async () => {
    apiFetchMock.mockResolvedValue({ requests: [{ id: 1 }, { id: 2 }] });

    const result = await getMyMcfRequests(42, 7);

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/mcf-requests/me?userId=7", {
      cache: "no-store",
    });
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("gets team MCF requests for staff view", async () => {
    apiFetchMock.mockResolvedValue({ requests: [{ id: 3 }] });

    const result = await getStaffTeamMcfRequests(9, 42, 5);

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/teams/5/mcf-requests?userId=9", {
      cache: "no-store",
    });
    expect(result).toEqual([{ id: 3 }]);
  });
});
