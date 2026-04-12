import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  evaluateProjectWarningsHandler,
  getMyTeamWarningsHandler,
  getProjectWarningsConfigHandler,
  mockResponse,
  service,
  updateProjectWarningsConfigHandler,
} from "./controller.test.shared.js";

describe("project warnings controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
