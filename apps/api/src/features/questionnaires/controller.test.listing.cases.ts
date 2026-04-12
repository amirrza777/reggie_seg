/* eslint-disable @typescript-eslint/no-explicit-any */
import { mockResponse } from "./controller.shared-test-helpers.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as service from "./service.js";
import {
  getMyTemplatesHandler,
  getPublicTemplatesFromOtherUsersHandler,
} from "./controller.js";

describe("getMyTemplatesHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when requester is missing", async () => {
    const req: any = { headers: {}, cookies: {} };
    const res = mockResponse();

    await getMyTemplatesHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(service.getMyTemplates).not.toHaveBeenCalled();
  });

  it("returns requester templates when authenticated", async () => {
    (service.getMyTemplates as any).mockResolvedValue([{ id: 10 }]);

    const req: any = { user: { sub: 55 } };
    const res = mockResponse();

    await getMyTemplatesHandler(req, res);

    expect(service.getMyTemplates).toHaveBeenCalledWith(55);
    expect(res.json).toHaveBeenCalledWith([{ id: 10 }]);
  });

  it("returns 500 for non-auth errors", async () => {
    (service.getMyTemplates as any).mockRejectedValue(new Error("db fail"));

    const req: any = { user: { sub: 55 } };
    const res = mockResponse();

    await getMyTemplatesHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("getPublicTemplatesFromOtherUsersHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when requester is missing", async () => {
    const req: any = { headers: {}, cookies: {} };
    const res = mockResponse();

    await getPublicTemplatesFromOtherUsersHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(service.getPublicTemplatesFromOtherUsers).not.toHaveBeenCalled();
  });

  it("returns public templates from others when authenticated", async () => {
    (service.getPublicTemplatesFromOtherUsers as any).mockResolvedValue([{ id: 11 }]);

    const req: any = { user: { sub: 77 } };
    const res = mockResponse();

    await getPublicTemplatesFromOtherUsersHandler(req, res);

    expect(service.getPublicTemplatesFromOtherUsers).toHaveBeenCalledWith(77);
    expect(res.json).toHaveBeenCalledWith([{ id: 11 }]);
  });

  it("returns 500 for non-auth errors", async () => {
    (service.getPublicTemplatesFromOtherUsers as any).mockRejectedValue(new Error("db fail"));

    const req: any = { user: { sub: 77 } };
    const res = mockResponse();

    await getPublicTemplatesFromOtherUsersHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
