import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import {
  getAllModulesSummaryHandler,
  getModuleDetailsHandler,
  getModuleTeamsSummaryHandler,
  getStudentDetailsHandler,
  getTeamDetailsHandler,
} from "./controller.js";
import * as service from "./service.js";

vi.mock("./service.js", () => ({
  getProgressForModulesILead: vi.fn(),
  getProgressForTeam: vi.fn(),
  getModuleDetailsIfLead: vi.fn(),
  getTeamDetailsIfLead: vi.fn(),
  getStudentDetailsIfLead: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("peerAssessment staff controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getAllModulesSummaryHandler validates staffId and returns modules", async () => {
    const badRes = mockResponse();
    await getAllModulesSummaryHandler({ query: {} } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.getProgressForModulesILead as any).mockResolvedValue([{ id: 1, title: "M", submitted: 2, expected: 4 }]);
    const res = mockResponse();
    await getAllModulesSummaryHandler({ query: { staffId: "5" } } as any, res);
    expect(service.getProgressForModulesILead).toHaveBeenCalledWith(5);
    expect(res.json).toHaveBeenCalledWith([{ id: 1, title: "M", submitted: 2, expected: 4 }]);
  });

  it("getModuleDetailsHandler validates params and maps null to 403", async () => {
    const badRes = mockResponse();
    await getModuleDetailsHandler({ query: { staffId: "1" }, params: { moduleId: "x" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.getModuleDetailsIfLead as any).mockResolvedValue(null);
    const forbiddenRes = mockResponse();
    await getModuleDetailsHandler({ query: { staffId: "1" }, params: { moduleId: "2" } } as any, forbiddenRes);
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);
  });

  it("getTeamDetailsHandler delegates and returns json", async () => {
    (service.getTeamDetailsIfLead as any).mockResolvedValue({
      module: { id: 1, title: "Module" },
      team: { id: 2, title: "Team" },
      students: [],
    });
    const res = mockResponse();
    await getTeamDetailsHandler(
      { query: { staffId: "1" }, params: { moduleId: "2", teamId: "3" } } as any,
      res
    );
    expect(service.getTeamDetailsIfLead).toHaveBeenCalledWith(1, 2, 3);
    expect(res.json).toHaveBeenCalled();
  });

  it("getStudentDetailsHandler returns 500 on service error", async () => {
    (service.getStudentDetailsIfLead as any).mockRejectedValue(new Error("boom"));
    const res = mockResponse();
    await getStudentDetailsHandler(
      { query: { staffId: "1" }, params: { moduleId: "2", teamId: "3", studentId: "4" } } as any,
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("getModuleTeamsSummaryHandler validates moduleId and returns teams", async () => {
    const badRes = mockResponse();
    await getModuleTeamsSummaryHandler({ query: {} } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.getProgressForTeam as any).mockResolvedValue([{ id: 2, title: "Team A", submitted: 1, expected: 2 }]);
    const res = mockResponse();
    await getModuleTeamsSummaryHandler({ query: { moduleId: "7" } } as any, res);
    expect(service.getProgressForTeam).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith([{ id: 2, title: "Team A", submitted: 1, expected: 2 }]);
  });
});
