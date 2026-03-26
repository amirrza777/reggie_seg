import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "express";
import * as service from "../service.js";
import {
  getProjectNavFlagsConfigHandler,
  updateProjectNavFlagsConfigHandler,
} from "./controller.js";

vi.mock("../service.js", () => ({
  fetchProjectNavFlagsConfigForStaff: vi.fn(),
  updateProjectNavFlagsConfigForStaff: vi.fn(),
}));

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe("project nav-flags controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getProjectNavFlagsConfigHandler returns 401 when unauthenticated", async () => {
    const res = mockResponse();
    await getProjectNavFlagsConfigHandler({ params: { projectId: "1" }, query: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("getProjectNavFlagsConfigHandler returns 400 when project id is invalid", async () => {
    const res = mockResponse();
    await getProjectNavFlagsConfigHandler(
      { user: { sub: 7 }, params: { projectId: "x" }, query: {} } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("getProjectNavFlagsConfigHandler returns 404 when project is missing", async () => {
    (service.fetchProjectNavFlagsConfigForStaff as any).mockResolvedValueOnce(null);
    const res = mockResponse();
    await getProjectNavFlagsConfigHandler(
      { user: { sub: 7 }, params: { projectId: "2" }, query: {} } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("getProjectNavFlagsConfigHandler returns config when found", async () => {
    const config = { id: 2, name: "P", projectNavFlags: { version: 1 } };
    (service.fetchProjectNavFlagsConfigForStaff as any).mockResolvedValueOnce(config);
    const res = mockResponse();
    await getProjectNavFlagsConfigHandler(
      { user: { sub: 7 }, params: { projectId: "2" }, query: {} } as any,
      res,
    );
    expect(service.fetchProjectNavFlagsConfigForStaff).toHaveBeenCalledWith(7, 2);
    expect(res.json).toHaveBeenCalledWith(config);
  });

  it("getProjectNavFlagsConfigHandler maps forbidden to 403", async () => {
    (service.fetchProjectNavFlagsConfigForStaff as any).mockRejectedValueOnce({
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    const res = mockResponse();
    await getProjectNavFlagsConfigHandler(
      { user: { sub: 7 }, params: { projectId: "2" }, query: {} } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("getProjectNavFlagsConfigHandler uses default forbidden message", async () => {
    (service.fetchProjectNavFlagsConfigForStaff as any).mockRejectedValueOnce({
      code: "FORBIDDEN",
    });
    const res = mockResponse();
    await getProjectNavFlagsConfigHandler(
      { user: { sub: 7 }, params: { projectId: "2" }, query: {} } as any,
      res,
    );
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("getProjectNavFlagsConfigHandler maps unknown error to 500", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (service.fetchProjectNavFlagsConfigForStaff as any).mockRejectedValueOnce(new Error("boom"));
    const res = mockResponse();
    await getProjectNavFlagsConfigHandler(
      { user: { sub: 7 }, params: { projectId: "2" }, query: {} } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });

  it("updateProjectNavFlagsConfigHandler returns 401 when unauthenticated", async () => {
    const res = mockResponse();
    await updateProjectNavFlagsConfigHandler({ params: { projectId: "1" }, query: {}, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("updateProjectNavFlagsConfigHandler returns 400 for invalid project id", async () => {
    const res = mockResponse();
    await updateProjectNavFlagsConfigHandler(
      { user: { sub: 7 }, params: { projectId: "x" }, query: {}, body: {} } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("updateProjectNavFlagsConfigHandler returns 400 when payload is missing", async () => {
    const res = mockResponse();
    await updateProjectNavFlagsConfigHandler(
      { user: { sub: 7 }, params: { projectId: "2" }, query: {}, body: {} } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("updateProjectNavFlagsConfigHandler updates config", async () => {
    const payload = { version: 1, active: {}, completed: {}, peerModes: {} };
    const updated = { id: 2, name: "P", projectNavFlags: payload };
    (service.updateProjectNavFlagsConfigForStaff as any).mockResolvedValueOnce(updated);
    const res = mockResponse();
    await updateProjectNavFlagsConfigHandler(
      {
        user: { sub: 7 },
        params: { projectId: "2" },
        query: {},
        body: { projectNavFlags: payload },
      } as any,
      res,
    );
    expect(service.updateProjectNavFlagsConfigForStaff).toHaveBeenCalledWith(7, 2, payload);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  it("updateProjectNavFlagsConfigHandler maps invalid config to 400", async () => {
    (service.updateProjectNavFlagsConfigForStaff as any).mockRejectedValueOnce({
      code: "INVALID_PROJECT_NAV_FLAGS_CONFIG",
      message: "invalid",
    });
    const res = mockResponse();
    await updateProjectNavFlagsConfigHandler(
      {
        user: { sub: 7 },
        params: { projectId: "2" },
        query: {},
        body: { projectNavFlags: {} },
      } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("updateProjectNavFlagsConfigHandler uses default invalid-config message", async () => {
    (service.updateProjectNavFlagsConfigForStaff as any).mockRejectedValueOnce({
      code: "INVALID_PROJECT_NAV_FLAGS_CONFIG",
    });
    const res = mockResponse();
    await updateProjectNavFlagsConfigHandler(
      {
        user: { sub: 7 },
        params: { projectId: "2" },
        query: {},
        body: { projectNavFlags: {} },
      } as any,
      res,
    );
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid project feature flags config" });
  });

  it("updateProjectNavFlagsConfigHandler maps forbidden to 403", async () => {
    (service.updateProjectNavFlagsConfigForStaff as any).mockRejectedValueOnce({
      code: "FORBIDDEN",
      message: "Forbidden",
    });
    const res = mockResponse();
    await updateProjectNavFlagsConfigHandler(
      {
        user: { sub: 7 },
        params: { projectId: "2" },
        query: {},
        body: { projectNavFlags: {} },
      } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("updateProjectNavFlagsConfigHandler uses default forbidden message", async () => {
    (service.updateProjectNavFlagsConfigForStaff as any).mockRejectedValueOnce({
      code: "FORBIDDEN",
    });
    const res = mockResponse();
    await updateProjectNavFlagsConfigHandler(
      {
        user: { sub: 7 },
        params: { projectId: "2" },
        query: {},
        body: { projectNavFlags: {} },
      } as any,
      res,
    );
    expect(res.json).toHaveBeenCalledWith({ error: "Forbidden" });
  });

  it("updateProjectNavFlagsConfigHandler maps project missing to 404", async () => {
    (service.updateProjectNavFlagsConfigForStaff as any).mockRejectedValueOnce({
      code: "PROJECT_NOT_FOUND",
    });
    const res = mockResponse();
    await updateProjectNavFlagsConfigHandler(
      {
        user: { sub: 7 },
        params: { projectId: "2" },
        query: {},
        body: { projectNavFlags: {} },
      } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("updateProjectNavFlagsConfigHandler maps unknown error to 500", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (service.updateProjectNavFlagsConfigForStaff as any).mockRejectedValueOnce(new Error("boom"));
    const res = mockResponse();
    await updateProjectNavFlagsConfigHandler(
      {
        user: { sub: 7 },
        params: { projectId: "2" },
        query: {},
        body: { projectNavFlags: {} },
      } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(500);
    errorSpy.mockRestore();
  });
});
