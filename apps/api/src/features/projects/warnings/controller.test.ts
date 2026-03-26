import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "../service.js";
import {
  createStaffTeamWarningHandler,
  evaluateProjectWarningsHandler,
  getMyTeamWarningsHandler,
  getProjectWarningsConfigHandler,
  getStaffTeamWarningsHandler,
  resolveStaffTeamWarningHandler,
  updateProjectWarningsConfigHandler,
} from "./controller.js";

vi.mock("../service.js", () => ({
  createTeamWarningForStaff: vi.fn(),
  evaluateProjectWarningsForStaff: vi.fn(),
  fetchMyTeamWarnings: vi.fn(),
  fetchProjectWarningsConfigForStaff: vi.fn(),
  fetchTeamWarningsForStaff: vi.fn(),
  resolveTeamWarningForStaff: vi.fn(),
  updateProjectWarningsConfigForStaff: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("project warnings controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createStaffTeamWarningHandler", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = mockResponse();
      await createStaffTeamWarningHandler({ params: { projectId: "1", teamId: "2" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 for invalid ids", async () => {
      const res = mockResponse();
      await createStaffTeamWarningHandler(
        { user: { sub: 7 }, params: { projectId: "x", teamId: "2" }, body: {} } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when required body fields are missing/invalid", async () => {
      const res = mockResponse();
      await createStaffTeamWarningHandler(
        {
          user: { sub: 7 },
          params: { projectId: "1", teamId: "2" },
          body: { type: "x", severity: "BAD", title: "t", details: "d" },
        } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when string fields are empty after trimming", async () => {
      const res = mockResponse();
      await createStaffTeamWarningHandler(
        {
          user: { sub: 7 },
          params: { projectId: "1", teamId: "2" },
          body: { type: "   ", severity: "LOW", title: "Warn", details: "Detail" },
        } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("creates warning and returns 201", async () => {
      (service.createTeamWarningForStaff as any).mockResolvedValueOnce({ id: 11 });
      const res = mockResponse();
      await createStaffTeamWarningHandler(
        {
          user: { sub: 7 },
          params: { projectId: "1", teamId: "2" },
          body: { type: "LOW_ATTENDANCE", severity: "HIGH", title: "Warn", details: "Detail" },
        } as any,
        res,
      );
      expect(service.createTeamWarningForStaff).toHaveBeenCalledWith(7, 1, 2, {
        type: "LOW_ATTENDANCE",
        severity: "HIGH",
        title: "Warn",
        details: "Detail",
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 404 when scope not found", async () => {
      (service.createTeamWarningForStaff as any).mockResolvedValueOnce(null);
      const res = mockResponse();
      await createStaffTeamWarningHandler(
        {
          user: { sub: 7 },
          params: { projectId: "1", teamId: "2" },
          body: { type: "LOW_ATTENDANCE", severity: "HIGH", title: "Warn", details: "Detail" },
        } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("maps WARNINGS_DISABLED to 409", async () => {
      (service.createTeamWarningForStaff as any).mockRejectedValueOnce({
        code: "WARNINGS_DISABLED",
        message: "Warnings disabled",
      });
      const res = mockResponse();
      await createStaffTeamWarningHandler(
        {
          user: { sub: 7 },
          params: { projectId: "1", teamId: "2" },
          body: { type: "LOW_ATTENDANCE", severity: "HIGH", title: "Warn", details: "Detail" },
        } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("uses default WARNINGS_DISABLED message when missing", async () => {
      (service.createTeamWarningForStaff as any).mockRejectedValueOnce({
        code: "WARNINGS_DISABLED",
      });
      const res = mockResponse();
      await createStaffTeamWarningHandler(
        {
          user: { sub: 7 },
          params: { projectId: "1", teamId: "2" },
          body: { type: "LOW_ATTENDANCE", severity: "HIGH", title: "Warn", details: "Detail" },
        } as any,
        res,
      );
      expect(res.json).toHaveBeenCalledWith({ error: "Warnings are disabled for this project" });
    });

    it("maps FORBIDDEN to 403", async () => {
      (service.createTeamWarningForStaff as any).mockRejectedValueOnce({
        code: "FORBIDDEN",
        message: "Forbidden",
      });
      const res = mockResponse();
      await createStaffTeamWarningHandler(
        {
          user: { sub: 7 },
          params: { projectId: "1", teamId: "2" },
          body: { type: "LOW_ATTENDANCE", severity: "HIGH", title: "Warn", details: "Detail" },
        } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("uses default FORBIDDEN message for create warning", async () => {
      (service.createTeamWarningForStaff as any).mockRejectedValueOnce({
        code: "FORBIDDEN",
      });
      const res = mockResponse();
      await createStaffTeamWarningHandler(
        {
          user: { sub: 7 },
          params: { projectId: "1", teamId: "2" },
          body: { type: "LOW_ATTENDANCE", severity: "HIGH", title: "Warn", details: "Detail" },
        } as any,
        res,
      );
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
    });

    it("maps unknown error to 500", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (service.createTeamWarningForStaff as any).mockRejectedValueOnce(new Error("boom"));
      const res = mockResponse();
      await createStaffTeamWarningHandler(
        {
          user: { sub: 7 },
          params: { projectId: "1", teamId: "2" },
          body: { type: "LOW_ATTENDANCE", severity: "HIGH", title: "Warn", details: "Detail" },
        } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(500);
      errorSpy.mockRestore();
    });
  });

  describe("getStaffTeamWarningsHandler", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = mockResponse();
      await getStaffTeamWarningsHandler({ params: { projectId: "1", teamId: "2" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 for invalid ids", async () => {
      const res = mockResponse();
      await getStaffTeamWarningsHandler(
        { user: { sub: 7 }, params: { projectId: "1", teamId: "x" }, body: {} } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns warnings for valid request", async () => {
      (service.fetchTeamWarningsForStaff as any).mockResolvedValueOnce([{ id: 1 }]);
      const res = mockResponse();
      await getStaffTeamWarningsHandler(
        { user: { sub: 7 }, params: { projectId: "1", teamId: "2" }, body: {} } as any,
        res,
      );
      expect(service.fetchTeamWarningsForStaff).toHaveBeenCalledWith(7, 1, 2);
      expect(res.json).toHaveBeenCalledWith({ warnings: [{ id: 1 }] });
    });

    it("returns 404 when scope is missing", async () => {
      (service.fetchTeamWarningsForStaff as any).mockResolvedValueOnce(null);
      const res = mockResponse();
      await getStaffTeamWarningsHandler(
        { user: { sub: 7 }, params: { projectId: "1", teamId: "2" }, body: {} } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("maps FORBIDDEN to 403", async () => {
      (service.fetchTeamWarningsForStaff as any).mockRejectedValueOnce({ code: "FORBIDDEN", message: "Forbidden" });
      const res = mockResponse();
      await getStaffTeamWarningsHandler(
        { user: { sub: 7 }, params: { projectId: "1", teamId: "2" }, body: {} } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("uses default FORBIDDEN message for get staff warnings", async () => {
      (service.fetchTeamWarningsForStaff as any).mockRejectedValueOnce({ code: "FORBIDDEN" });
      const res = mockResponse();
      await getStaffTeamWarningsHandler(
        { user: { sub: 7 }, params: { projectId: "1", teamId: "2" }, body: {} } as any,
        res,
      );
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
    });

    it("maps unknown error to 500", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (service.fetchTeamWarningsForStaff as any).mockRejectedValueOnce(new Error("boom"));
      const res = mockResponse();
      await getStaffTeamWarningsHandler(
        { user: { sub: 7 }, params: { projectId: "1", teamId: "2" }, body: {} } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(500);
      errorSpy.mockRestore();
    });
  });

  describe("resolveStaffTeamWarningHandler", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = mockResponse();
      await resolveStaffTeamWarningHandler(
        { params: { projectId: "1", teamId: "2", warningId: "9" }, body: {} } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 for invalid ids", async () => {
      const res = mockResponse();
      await resolveStaffTeamWarningHandler(
        { user: { sub: 7 }, params: { projectId: "1", teamId: "2", warningId: "x" }, body: {} } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns resolved warning", async () => {
      (service.resolveTeamWarningForStaff as any).mockResolvedValueOnce({ id: 9 });
      const res = mockResponse();
      await resolveStaffTeamWarningHandler(
        { user: { sub: 7 }, params: { projectId: "1", teamId: "2", warningId: "9" }, body: {} } as any,
        res,
      );
      expect(service.resolveTeamWarningForStaff).toHaveBeenCalledWith(7, 1, 2, 9);
      expect(res.json).toHaveBeenCalledWith({ warning: { id: 9 } });
    });

    it("returns 404 when warning is missing", async () => {
      (service.resolveTeamWarningForStaff as any).mockResolvedValueOnce(null);
      const res = mockResponse();
      await resolveStaffTeamWarningHandler(
        { user: { sub: 7 }, params: { projectId: "1", teamId: "2", warningId: "9" }, body: {} } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("maps FORBIDDEN to 403", async () => {
      (service.resolveTeamWarningForStaff as any).mockRejectedValueOnce({ code: "FORBIDDEN", message: "Forbidden" });
      const res = mockResponse();
      await resolveStaffTeamWarningHandler(
        { user: { sub: 7 }, params: { projectId: "1", teamId: "2", warningId: "9" }, body: {} } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("uses default FORBIDDEN message for resolve warning", async () => {
      (service.resolveTeamWarningForStaff as any).mockRejectedValueOnce({ code: "FORBIDDEN" });
      const res = mockResponse();
      await resolveStaffTeamWarningHandler(
        { user: { sub: 7 }, params: { projectId: "1", teamId: "2", warningId: "9" }, body: {} } as any,
        res,
      );
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
    });

    it("maps unknown error to 500", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (service.resolveTeamWarningForStaff as any).mockRejectedValueOnce(new Error("boom"));
      const res = mockResponse();
      await resolveStaffTeamWarningHandler(
        { user: { sub: 7 }, params: { projectId: "1", teamId: "2", warningId: "9" }, body: {} } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(500);
      errorSpy.mockRestore();
    });
  });

  describe("getMyTeamWarningsHandler", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = mockResponse();
      await getMyTeamWarningsHandler({ params: { projectId: "1" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 for invalid project id", async () => {
      const res = mockResponse();
      await getMyTeamWarningsHandler({ user: { sub: 7 }, params: { projectId: "x" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns warnings for requester", async () => {
      (service.fetchMyTeamWarnings as any).mockResolvedValueOnce([{ id: 1 }]);
      const res = mockResponse();
      await getMyTeamWarningsHandler({ user: { sub: 7 }, params: { projectId: "1" }, body: {} } as any, res);
      expect(service.fetchMyTeamWarnings).toHaveBeenCalledWith(7, 1);
      expect(res.json).toHaveBeenCalledWith({ warnings: [{ id: 1 }] });
    });

    it("returns 404 when requester team is missing", async () => {
      (service.fetchMyTeamWarnings as any).mockResolvedValueOnce(null);
      const res = mockResponse();
      await getMyTeamWarningsHandler({ user: { sub: 7 }, params: { projectId: "1" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("maps unknown error to 500", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (service.fetchMyTeamWarnings as any).mockRejectedValueOnce(new Error("boom"));
      const res = mockResponse();
      await getMyTeamWarningsHandler({ user: { sub: 7 }, params: { projectId: "1" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(500);
      errorSpy.mockRestore();
    });
  });

  describe("getProjectWarningsConfigHandler", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = mockResponse();
      await getProjectWarningsConfigHandler({ params: { projectId: "1" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 for invalid project id", async () => {
      const res = mockResponse();
      await getProjectWarningsConfigHandler({ user: { sub: 7 }, params: { projectId: "x" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns config when project exists", async () => {
      (service.fetchProjectWarningsConfigForStaff as any).mockResolvedValueOnce({ id: 1 });
      const res = mockResponse();
      await getProjectWarningsConfigHandler({ user: { sub: 7 }, params: { projectId: "1" }, body: {} } as any, res);
      expect(service.fetchProjectWarningsConfigForStaff).toHaveBeenCalledWith(7, 1);
      expect(res.json).toHaveBeenCalledWith({ id: 1 });
    });

    it("returns 404 when project missing", async () => {
      (service.fetchProjectWarningsConfigForStaff as any).mockResolvedValueOnce(null);
      const res = mockResponse();
      await getProjectWarningsConfigHandler({ user: { sub: 7 }, params: { projectId: "1" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("maps FORBIDDEN to 403", async () => {
      (service.fetchProjectWarningsConfigForStaff as any).mockRejectedValueOnce({ code: "FORBIDDEN", message: "no" });
      const res = mockResponse();
      await getProjectWarningsConfigHandler({ user: { sub: 7 }, params: { projectId: "1" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("uses default FORBIDDEN message for get warnings config", async () => {
      (service.fetchProjectWarningsConfigForStaff as any).mockRejectedValueOnce({ code: "FORBIDDEN" });
      const res = mockResponse();
      await getProjectWarningsConfigHandler({ user: { sub: 7 }, params: { projectId: "1" }, body: {} } as any, res);
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
    });

    it("maps unknown error to 500", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (service.fetchProjectWarningsConfigForStaff as any).mockRejectedValueOnce(new Error("boom"));
      const res = mockResponse();
      await getProjectWarningsConfigHandler({ user: { sub: 7 }, params: { projectId: "1" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(500);
      errorSpy.mockRestore();
    });
  });

  describe("updateProjectWarningsConfigHandler", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = mockResponse();
      await updateProjectWarningsConfigHandler({ params: { projectId: "1" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 for invalid project id", async () => {
      const res = mockResponse();
      await updateProjectWarningsConfigHandler({ user: { sub: 7 }, params: { projectId: "x" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when warningsConfig is missing", async () => {
      const res = mockResponse();
      await updateProjectWarningsConfigHandler({ user: { sub: 7 }, params: { projectId: "1" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("updates config", async () => {
      const payload = { version: 1, rules: [] };
      (service.updateProjectWarningsConfigForStaff as any).mockResolvedValueOnce({ id: 1, warningsConfig: payload });
      const res = mockResponse();
      await updateProjectWarningsConfigHandler(
        { user: { sub: 7 }, params: { projectId: "1" }, body: { warningsConfig: payload } } as any,
        res,
      );
      expect(service.updateProjectWarningsConfigForStaff).toHaveBeenCalledWith(7, 1, payload);
      expect(res.json).toHaveBeenCalledWith({ id: 1, warningsConfig: payload });
    });

    it("maps INVALID_WARNINGS_CONFIG to 400", async () => {
      (service.updateProjectWarningsConfigForStaff as any).mockRejectedValueOnce({
        code: "INVALID_WARNINGS_CONFIG",
        message: "bad",
      });
      const res = mockResponse();
      await updateProjectWarningsConfigHandler(
        { user: { sub: 7 }, params: { projectId: "1" }, body: { warningsConfig: {} } } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("uses default invalid-config message", async () => {
      (service.updateProjectWarningsConfigForStaff as any).mockRejectedValueOnce({
        code: "INVALID_WARNINGS_CONFIG",
      });
      const res = mockResponse();
      await updateProjectWarningsConfigHandler(
        { user: { sub: 7 }, params: { projectId: "1" }, body: { warningsConfig: {} } } as any,
        res,
      );
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid warnings config" });
    });

    it("maps FORBIDDEN to 403", async () => {
      (service.updateProjectWarningsConfigForStaff as any).mockRejectedValueOnce({ code: "FORBIDDEN", message: "no" });
      const res = mockResponse();
      await updateProjectWarningsConfigHandler(
        { user: { sub: 7 }, params: { projectId: "1" }, body: { warningsConfig: {} } } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("uses default FORBIDDEN message for update warnings config", async () => {
      (service.updateProjectWarningsConfigForStaff as any).mockRejectedValueOnce({ code: "FORBIDDEN" });
      const res = mockResponse();
      await updateProjectWarningsConfigHandler(
        { user: { sub: 7 }, params: { projectId: "1" }, body: { warningsConfig: {} } } as any,
        res,
      );
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
    });

    it("maps PROJECT_NOT_FOUND to 404", async () => {
      (service.updateProjectWarningsConfigForStaff as any).mockRejectedValueOnce({ code: "PROJECT_NOT_FOUND" });
      const res = mockResponse();
      await updateProjectWarningsConfigHandler(
        { user: { sub: 7 }, params: { projectId: "1" }, body: { warningsConfig: {} } } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("maps unknown error to 500", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (service.updateProjectWarningsConfigForStaff as any).mockRejectedValueOnce(new Error("boom"));
      const res = mockResponse();
      await updateProjectWarningsConfigHandler(
        { user: { sub: 7 }, params: { projectId: "1" }, body: { warningsConfig: {} } } as any,
        res,
      );
      expect(res.status).toHaveBeenCalledWith(500);
      errorSpy.mockRestore();
    });
  });

  describe("evaluateProjectWarningsHandler", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = mockResponse();
      await evaluateProjectWarningsHandler({ params: { projectId: "1" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("returns 400 for invalid project id", async () => {
      const res = mockResponse();
      await evaluateProjectWarningsHandler({ user: { sub: 7 }, params: { projectId: "x" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns summary", async () => {
      (service.evaluateProjectWarningsForStaff as any).mockResolvedValueOnce({ createdWarnings: 1 });
      const res = mockResponse();
      await evaluateProjectWarningsHandler({ user: { sub: 7 }, params: { projectId: "1" }, body: {} } as any, res);
      expect(service.evaluateProjectWarningsForStaff).toHaveBeenCalledWith(7, 1);
      expect(res.json).toHaveBeenCalledWith({ createdWarnings: 1 });
    });

    it("returns 404 when project missing", async () => {
      (service.evaluateProjectWarningsForStaff as any).mockResolvedValueOnce(null);
      const res = mockResponse();
      await evaluateProjectWarningsHandler({ user: { sub: 7 }, params: { projectId: "1" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("maps FORBIDDEN to 403", async () => {
      (service.evaluateProjectWarningsForStaff as any).mockRejectedValueOnce({ code: "FORBIDDEN", message: "no" });
      const res = mockResponse();
      await evaluateProjectWarningsHandler({ user: { sub: 7 }, params: { projectId: "1" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("uses default FORBIDDEN message for evaluate", async () => {
      (service.evaluateProjectWarningsForStaff as any).mockRejectedValueOnce({ code: "FORBIDDEN" });
      const res = mockResponse();
      await evaluateProjectWarningsHandler({ user: { sub: 7 }, params: { projectId: "1" }, body: {} } as any, res);
      expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
    });

    it("maps unknown error to 500", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (service.evaluateProjectWarningsForStaff as any).mockRejectedValueOnce(new Error("boom"));
      const res = mockResponse();
      await evaluateProjectWarningsHandler({ user: { sub: 7 }, params: { projectId: "1" }, body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(500);
      errorSpy.mockRestore();
    });
  });
});
