import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import {
  getAllModulesSummaryHandler,
  getModuleDetailsHandler,
  getModuleTeamsSummaryHandler,
  getStudentDetailsHandler,
  getTeamDetailsHandler,
  upsertStudentMarkingHandler,
  upsertTeamMarkingHandler,
} from "./controller.js";
import * as service from "./service.js";
import { sendProjectOrModuleArchivedConflict } from "../../../shared/projectWriteGuard.js";

vi.mock("./service.js", () => ({
  getProgressForModulesILead: vi.fn(),
  getProgressForTeam: vi.fn(),
  getModuleDetailsIfLead: vi.fn(),
  getTeamDetailsIfLead: vi.fn(),
  getStudentDetailsIfLead: vi.fn(),
  saveTeamMarkingIfLead: vi.fn(),
  saveStudentMarkingIfLead: vi.fn(),
}));

vi.mock("../../../shared/projectWriteGuard.js", () => ({
  sendProjectOrModuleArchivedConflict: vi.fn(),
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
    (sendProjectOrModuleArchivedConflict as any).mockReturnValue(false);
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

  it("getAllModulesSummaryHandler returns 500 on service failure", async () => {
    (service.getProgressForModulesILead as any).mockRejectedValueOnce(new Error("boom"));
    const res = mockResponse();
    await getAllModulesSummaryHandler({ query: { staffId: "5" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
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

  it("getModuleDetailsHandler returns 500 on service failure", async () => {
    (service.getModuleDetailsIfLead as any).mockRejectedValueOnce(new Error("boom"));
    const res = mockResponse();
    await getModuleDetailsHandler({ query: { staffId: "1" }, params: { moduleId: "2" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
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

  it("getTeamDetailsHandler validates team id, maps null to 404, and handles service failure", async () => {
    const badRes = mockResponse();
    await getTeamDetailsHandler(
      { query: { staffId: "1" }, params: { moduleId: "2", teamId: "x" } } as any,
      badRes
    );
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.getTeamDetailsIfLead as any).mockResolvedValueOnce(null);
    const notFoundRes = mockResponse();
    await getTeamDetailsHandler(
      { query: { staffId: "1" }, params: { moduleId: "2", teamId: "3" } } as any,
      notFoundRes
    );
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    (service.getTeamDetailsIfLead as any).mockRejectedValueOnce(new Error("boom"));
    const errorRes = mockResponse();
    await getTeamDetailsHandler(
      { query: { staffId: "1" }, params: { moduleId: "2", teamId: "3" } } as any,
      errorRes
    );
    expect(errorRes.status).toHaveBeenCalledWith(500);
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

  it("getStudentDetailsHandler validates student id and maps null to 404", async () => {
    const badRes = mockResponse();
    await getStudentDetailsHandler(
      { query: { staffId: "1" }, params: { moduleId: "2", teamId: "3", studentId: "x" } } as any,
      badRes
    );
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.getStudentDetailsIfLead as any).mockResolvedValueOnce(null);
    const notFoundRes = mockResponse();
    await getStudentDetailsHandler(
      { query: { staffId: "1" }, params: { moduleId: "2", teamId: "3", studentId: "4" } } as any,
      notFoundRes
    );
    expect(notFoundRes.status).toHaveBeenCalledWith(404);
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

  it("getModuleTeamsSummaryHandler returns 500 when progress fetch fails", async () => {
    (service.getProgressForTeam as any).mockRejectedValueOnce(new Error("boom"));
    const res = mockResponse();
    await getModuleTeamsSummaryHandler({ query: { moduleId: "7" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch teams" });
  });

  it("upsertTeamMarkingHandler validates payload and supports success/not-found/conflict/500 branches", async () => {
    const badBodyRes = mockResponse();
    await upsertTeamMarkingHandler(
      {
        query: { staffId: "1" },
        params: { moduleId: "2", teamId: "3" },
        body: { mark: "bad" },
      } as any,
      badBodyRes,
    );
    expect(badBodyRes.status).toHaveBeenCalledWith(400);
    expect(service.saveTeamMarkingIfLead).not.toHaveBeenCalled();

    (service.saveTeamMarkingIfLead as any).mockResolvedValueOnce(null);
    const notFoundRes = mockResponse();
    await upsertTeamMarkingHandler(
      {
        query: { staffId: "1" },
        params: { moduleId: "2", teamId: "3" },
        body: { mark: 80, formativeFeedback: "Good work" },
      } as any,
      notFoundRes,
    );
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    (service.saveTeamMarkingIfLead as any).mockResolvedValueOnce({ mark: 88 });
    const okRes = mockResponse();
    await upsertTeamMarkingHandler(
      {
        query: { staffId: "1" },
        params: { moduleId: "2", teamId: "3" },
        body: { mark: 88, formativeFeedback: "Strong improvement" },
      } as any,
      okRes,
    );
    expect(okRes.json).toHaveBeenCalledWith({ mark: 88 });

    (service.saveTeamMarkingIfLead as any).mockRejectedValueOnce({ code: "PROJECT_ARCHIVED" });
    (sendProjectOrModuleArchivedConflict as any).mockReturnValueOnce(true);
    const conflictRes = mockResponse();
    await upsertTeamMarkingHandler(
      {
        query: { staffId: "1" },
        params: { moduleId: "2", teamId: "3" },
        body: { mark: 75 },
      } as any,
      conflictRes,
    );
    expect(sendProjectOrModuleArchivedConflict).toHaveBeenCalled();
    expect(conflictRes.status).not.toHaveBeenCalledWith(500);

    (service.saveTeamMarkingIfLead as any).mockRejectedValueOnce(new Error("boom"));
    const errorRes = mockResponse();
    await upsertTeamMarkingHandler(
      {
        query: { staffId: "1" },
        params: { moduleId: "2", teamId: "3" },
        body: { mark: 75 },
      } as any,
      errorRes,
    );
    expect(errorRes.status).toHaveBeenCalledWith(500);
    expect(errorRes.json).toHaveBeenCalledWith({ error: "Error saving team marking" });
  });

  it("upsertStudentMarkingHandler validates payload and supports success/not-found/conflict/500 branches", async () => {
    const badBodyRes = mockResponse();
    await upsertStudentMarkingHandler(
      {
        query: { staffId: "1" },
        params: { moduleId: "2", teamId: "3", studentId: "4" },
        body: { formativeFeedback: 12 },
      } as any,
      badBodyRes,
    );
    expect(badBodyRes.status).toHaveBeenCalledWith(400);
    expect(service.saveStudentMarkingIfLead).not.toHaveBeenCalled();

    const badStudentRes = mockResponse();
    await upsertStudentMarkingHandler(
      {
        query: { staffId: "1" },
        params: { moduleId: "2", teamId: "3", studentId: "x" },
        body: { mark: 50 },
      } as any,
      badStudentRes,
    );
    expect(badStudentRes.status).toHaveBeenCalledWith(400);

    (service.saveStudentMarkingIfLead as any).mockResolvedValueOnce(null);
    const notFoundRes = mockResponse();
    await upsertStudentMarkingHandler(
      {
        query: { staffId: "1" },
        params: { moduleId: "2", teamId: "3", studentId: "4" },
        body: { mark: 80, formativeFeedback: "Good work" },
      } as any,
      notFoundRes,
    );
    expect(notFoundRes.status).toHaveBeenCalledWith(404);

    (service.saveStudentMarkingIfLead as any).mockResolvedValueOnce({ mark: 82 });
    const okRes = mockResponse();
    await upsertStudentMarkingHandler(
      {
        query: { staffId: "1" },
        params: { moduleId: "2", teamId: "3", studentId: "4" },
        body: { mark: 82, formativeFeedback: "Steady progress" },
      } as any,
      okRes,
    );
    expect(okRes.json).toHaveBeenCalledWith({ mark: 82 });

    (service.saveStudentMarkingIfLead as any).mockRejectedValueOnce({ code: "MODULE_ARCHIVED" });
    (sendProjectOrModuleArchivedConflict as any).mockReturnValueOnce(true);
    const conflictRes = mockResponse();
    await upsertStudentMarkingHandler(
      {
        query: { staffId: "1" },
        params: { moduleId: "2", teamId: "3", studentId: "4" },
        body: { mark: 75 },
      } as any,
      conflictRes,
    );
    expect(sendProjectOrModuleArchivedConflict).toHaveBeenCalled();
    expect(conflictRes.status).not.toHaveBeenCalledWith(500);

    (service.saveStudentMarkingIfLead as any).mockRejectedValueOnce(new Error("boom"));
    const errorRes = mockResponse();
    await upsertStudentMarkingHandler(
      {
        query: { staffId: "1" },
        params: { moduleId: "2", teamId: "3", studentId: "4" },
        body: { mark: 75 },
      } as any,
      errorRes,
    );
    expect(errorRes.status).toHaveBeenCalledWith(500);
    expect(errorRes.json).toHaveBeenCalledWith({ error: "Error saving student marking" });
  });
});
