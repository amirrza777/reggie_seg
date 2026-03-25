import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response } from "express";
import * as service from "./service.js";
import {
  listModulesHandler,
  listProjectsHandler,
  listTeamsHandler,
  archiveModuleHandler,
  unarchiveModuleHandler,
  archiveProjectHandler,
  unarchiveProjectHandler,
  archiveTeamHandler,
  unarchiveTeamHandler,
} from "./controller.js";

vi.mock("./service.js", () => ({
  isStaffOrAdmin: vi.fn(),
  getModules: vi.fn(),
  getProjects: vi.fn(),
  getTeams: vi.fn(),
  archiveModule: vi.fn(),
  unarchiveModule: vi.fn(),
  archiveProject: vi.fn(),
  unarchiveProject: vi.fn(),
  archiveTeam: vi.fn(),
  unarchiveTeam: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function authedReq(params: Record<string, string> = {}) {
  return { user: { sub: 1 }, params } as any;
}

describe("archive controller", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("listModulesHandler", () => {
    it("returns 403 when not staff or admin", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(false);
      const res = mockResponse();
      await listModulesHandler(authedReq(), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns modules when authorised", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(true);
      (service.getModules as any).mockResolvedValue([{ id: 1 }]);
      const res = mockResponse();
      await listModulesHandler(authedReq(), res);
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });
  });

  describe("listProjectsHandler", () => {
    it("returns 403 when not staff or admin", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(false);
      const res = mockResponse();
      await listProjectsHandler(authedReq(), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns projects when authorised", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(true);
      (service.getProjects as any).mockResolvedValue([{ id: 2 }]);
      const res = mockResponse();
      await listProjectsHandler(authedReq(), res);
      expect(res.json).toHaveBeenCalledWith([{ id: 2 }]);
    });
  });

  describe("listTeamsHandler", () => {
    it("returns 403 when not staff or admin", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(false);
      const res = mockResponse();
      await listTeamsHandler(authedReq(), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns teams when authorised", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(true);
      (service.getTeams as any).mockResolvedValue([{ id: 3 }]);
      const res = mockResponse();
      await listTeamsHandler(authedReq(), res);
      expect(res.json).toHaveBeenCalledWith([{ id: 3 }]);
    });
  });

  describe("archiveModuleHandler", () => {
    it("returns 403 when not staff or admin", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(false);
      const res = mockResponse();
      await archiveModuleHandler(authedReq({ id: "1" }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 for invalid id", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(true);
      const res = mockResponse();
      await archiveModuleHandler(authedReq({ id: "abc" }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns result on success", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(true);
      (service.archiveModule as any).mockResolvedValue({ id: 1 });
      const res = mockResponse();
      await archiveModuleHandler(authedReq({ id: "1" }), res);
      expect(service.archiveModule).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe("unarchiveModuleHandler", () => {
    it("returns 403 when not staff or admin", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(false);
      const res = mockResponse();
      await unarchiveModuleHandler(authedReq({ id: "1" }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 for invalid id", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(true);
      const res = mockResponse();
      await unarchiveModuleHandler(authedReq({ id: "abc" }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns result on success", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(true);
      (service.unarchiveModule as any).mockResolvedValue({ id: 1 });
      const res = mockResponse();
      await unarchiveModuleHandler(authedReq({ id: "1" }), res);
      expect(service.unarchiveModule).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe("archiveProjectHandler", () => {
    it("returns 403 when not staff or admin", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(false);
      const res = mockResponse();
      await archiveProjectHandler(authedReq({ id: "2" }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 for invalid id", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(true);
      const res = mockResponse();
      await archiveProjectHandler(authedReq({ id: "bad" }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns result on success", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(true);
      (service.archiveProject as any).mockResolvedValue({ id: 2 });
      const res = mockResponse();
      await archiveProjectHandler(authedReq({ id: "2" }), res);
      expect(service.archiveProject).toHaveBeenCalledWith(2);
      expect(res.json).toHaveBeenCalledWith({ id: 2 });
    });
  });

  describe("unarchiveProjectHandler", () => {
    it("returns 403 when not staff or admin", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(false);
      const res = mockResponse();
      await unarchiveProjectHandler(authedReq({ id: "2" }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 for invalid id", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(true);
      const res = mockResponse();
      await unarchiveProjectHandler(authedReq({ id: "bad" }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns result on success", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(true);
      (service.unarchiveProject as any).mockResolvedValue({ id: 2 });
      const res = mockResponse();
      await unarchiveProjectHandler(authedReq({ id: "2" }), res);
      expect(service.unarchiveProject).toHaveBeenCalledWith(2);
      expect(res.json).toHaveBeenCalledWith({ id: 2 });
    });
  });

  describe("archiveTeamHandler", () => {
    it("returns 403 when not staff or admin", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(false);
      const res = mockResponse();
      await archiveTeamHandler(authedReq({ id: "3" }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 for invalid id", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(true);
      const res = mockResponse();
      await archiveTeamHandler(authedReq({ id: "xyz" }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns result on success", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(true);
      (service.archiveTeam as any).mockResolvedValue({ id: 3 });
      const res = mockResponse();
      await archiveTeamHandler(authedReq({ id: "3" }), res);
      expect(service.archiveTeam).toHaveBeenCalledWith(3);
      expect(res.json).toHaveBeenCalledWith({ id: 3 });
    });
  });

  describe("unarchiveTeamHandler", () => {
    it("returns 403 when not staff or admin", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(false);
      const res = mockResponse();
      await unarchiveTeamHandler(authedReq({ id: "3" }), res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 400 for invalid id", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(true);
      const res = mockResponse();
      await unarchiveTeamHandler(authedReq({ id: "xyz" }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns result on success", async () => {
      (service.isStaffOrAdmin as any).mockResolvedValue(true);
      (service.unarchiveTeam as any).mockResolvedValue({ id: 3 });
      const res = mockResponse();
      await unarchiveTeamHandler(authedReq({ id: "3" }), res);
      expect(service.unarchiveTeam).toHaveBeenCalledWith(3);
      expect(res.json).toHaveBeenCalledWith({ id: 3 });
    });
  });
});
