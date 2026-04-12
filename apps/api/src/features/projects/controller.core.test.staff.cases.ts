/* eslint-disable max-lines-per-function, max-statements, @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockResponse } from "./controller.core.shared-test-helpers.js";
import * as service from "./service.js";
import {
  getProjectMarkingHandler,
  getStaffMarkingProjectsHandler,
  getStaffProjectTeamsHandler,
  getStaffProjectsHandler,
} from "./controller.js";

describe("project staff handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getStaffProjectsHandler and getStaffProjectTeamsHandler use authenticated user id", async () => {
    const staffProjectsRes = mockResponse();
    (service.fetchProjectsForStaff as any).mockResolvedValue([{ id: 1, name: "P1" }]);
    await getStaffProjectsHandler({ user: { sub: 12 }, query: { userId: "12" } } as any, staffProjectsRes);
    expect(service.fetchProjectsForStaff).toHaveBeenCalledWith(12, {
      query: undefined,
      moduleId: undefined,
    });
    expect(staffProjectsRes.json).toHaveBeenCalledWith([{ id: 1, name: "P1" }]);

    const badModuleIdRes = mockResponse();
    await getStaffProjectsHandler({ user: { sub: 12 }, query: { userId: "12", moduleId: "abc" } } as any, badModuleIdRes);
    expect(badModuleIdRes.status).toHaveBeenCalledWith(400);
    expect(service.fetchProjectsForStaff).toHaveBeenCalledTimes(1);

    const staffTeamsRes = mockResponse();
    (service.fetchProjectTeamsForStaff as any).mockResolvedValue({
      project: { id: 9, name: "P9", moduleId: 1, moduleName: "M1" },
      teams: [],
    });
    await getStaffProjectTeamsHandler(
      { user: { sub: 12 }, params: { projectId: "9" }, query: { userId: "12" } } as any,
      staffTeamsRes,
    );
    expect(service.fetchProjectTeamsForStaff).toHaveBeenCalledWith(12, 9);
    expect(staffTeamsRes.json).toHaveBeenCalledWith({
      project: { id: 9, name: "P9", moduleId: 1, moduleName: "M1" },
      teams: [],
    });
  });

  it("getProjectMarkingHandler uses authenticated user id", async () => {
    (service.fetchProjectMarking as any).mockResolvedValue({
      teamId: 5,
      teamMarking: null,
      studentMarking: null,
    });
    const res = mockResponse();
    await getProjectMarkingHandler(
      { user: { sub: 4 }, params: { projectId: "5" }, query: { userId: "4" } } as any,
      res,
    );
    expect(service.fetchProjectMarking).toHaveBeenCalledWith(4, 5);
    expect(res.json).toHaveBeenCalledWith({
      teamId: 5,
      teamMarking: null,
      studentMarking: null,
    });
  });

  it("getStaffProjectsHandler covers query validation and error branches", async () => {
    const unauthorizedRes = mockResponse();
    await getStaffProjectsHandler({ query: {} } as any, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badQueryRes = mockResponse();
    await getStaffProjectsHandler({ user: { sub: 4 }, query: { q: ["bad"] } } as any, badQueryRes);
    expect(badQueryRes.status).toHaveBeenCalledWith(400);

    const badModuleIdRes = mockResponse();
    await getStaffProjectsHandler({ user: { sub: 4 }, query: { moduleId: "0" } } as any, badModuleIdRes);
    expect(badModuleIdRes.status).toHaveBeenCalledWith(400);

    (service.fetchProjectsForStaff as any).mockRejectedValueOnce(new Error("staff-project-fail"));
    const errorRes = mockResponse();
    await getStaffProjectsHandler({ user: { sub: 4 }, query: { q: "  alpha  ", moduleId: "2" } } as any, errorRes);
    expect(service.fetchProjectsForStaff).toHaveBeenCalledWith(4, { query: "alpha", moduleId: 2 });
    expect(errorRes.status).toHaveBeenCalledWith(500);
  });

  it("getStaffProjectTeamsHandler and getProjectMarkingHandler cover auth/not-found/error branches", async () => {
    const teamsUnauthorizedRes = mockResponse();
    await getStaffProjectTeamsHandler({ params: { projectId: "2" } } as any, teamsUnauthorizedRes);
    expect(teamsUnauthorizedRes.status).toHaveBeenCalledWith(401);

    const teamsBadIdRes = mockResponse();
    await getStaffProjectTeamsHandler({ user: { sub: 4 }, params: { projectId: "x" } } as any, teamsBadIdRes);
    expect(teamsBadIdRes.status).toHaveBeenCalledWith(400);

    (service.fetchProjectTeamsForStaff as any)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce({ code: "P2021" })
      .mockRejectedValueOnce(new Error("teams-fail"));
    const teamsMissingRes = mockResponse();
    await getStaffProjectTeamsHandler({ user: { sub: 4 }, params: { projectId: "2" } } as any, teamsMissingRes);
    expect(teamsMissingRes.status).toHaveBeenCalledWith(404);
    const teamsMigrationRes = mockResponse();
    await getStaffProjectTeamsHandler({ user: { sub: 4 }, params: { projectId: "2" } } as any, teamsMigrationRes);
    expect(teamsMigrationRes.status).toHaveBeenCalledWith(503);
    const teamsErrorRes = mockResponse();
    await getStaffProjectTeamsHandler({ user: { sub: 4 }, params: { projectId: "2" } } as any, teamsErrorRes);
    expect(teamsErrorRes.status).toHaveBeenCalledWith(500);

    const markingUnauthorizedRes = mockResponse();
    await getProjectMarkingHandler({ params: { projectId: "2" } } as any, markingUnauthorizedRes);
    expect(markingUnauthorizedRes.status).toHaveBeenCalledWith(401);

    const markingBadIdRes = mockResponse();
    await getProjectMarkingHandler({ user: { sub: 4 }, params: { projectId: "x" } } as any, markingBadIdRes);
    expect(markingBadIdRes.status).toHaveBeenCalledWith(400);

    (service.fetchProjectMarking as any)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce({ code: "P2022" })
      .mockRejectedValueOnce(new Error("marking-fail"));
    const markingMissingRes = mockResponse();
    await getProjectMarkingHandler({ user: { sub: 4 }, params: { projectId: "2" } } as any, markingMissingRes);
    expect(markingMissingRes.status).toHaveBeenCalledWith(404);
    const markingMigrationRes = mockResponse();
    await getProjectMarkingHandler({ user: { sub: 4 }, params: { projectId: "2" } } as any, markingMigrationRes);
    expect(markingMigrationRes.status).toHaveBeenCalledWith(503);
    const markingErrorRes = mockResponse();
    await getProjectMarkingHandler({ user: { sub: 4 }, params: { projectId: "2" } } as any, markingErrorRes);
    expect(markingErrorRes.status).toHaveBeenCalledWith(500);
  });

  it("getStaffMarkingProjectsHandler covers auth, query validation, success, and failure", async () => {
    const unauthorizedRes = mockResponse();
    await getStaffMarkingProjectsHandler({ query: {} } as any, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badQueryRes = mockResponse();
    await getStaffMarkingProjectsHandler({ user: { sub: 4 }, query: { q: ["bad"] } } as any, badQueryRes);
    expect(badQueryRes.status).toHaveBeenCalledWith(400);

    (service.fetchProjectsWithTeamsForStaffMarking as any).mockResolvedValueOnce([{ id: 99, name: "Marking Project" }]);
    const okRes = mockResponse();
    await getStaffMarkingProjectsHandler({ user: { sub: 4 }, query: { q: "  beta  " } } as any, okRes);
    expect(service.fetchProjectsWithTeamsForStaffMarking).toHaveBeenCalledWith(4, { query: "beta" });
    expect(okRes.json).toHaveBeenCalledWith([{ id: 99, name: "Marking Project" }]);

    (service.fetchProjectsWithTeamsForStaffMarking as any).mockRejectedValueOnce(new Error("marking-project-fail"));
    const errorRes = mockResponse();
    await getStaffMarkingProjectsHandler({ user: { sub: 4 }, query: {} } as any, errorRes);
    expect(errorRes.status).toHaveBeenCalledWith(500);
  });
});
