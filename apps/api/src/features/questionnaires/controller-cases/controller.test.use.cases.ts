/* eslint-disable max-lines-per-function, @typescript-eslint/no-explicit-any */
import { mockResponse } from "./shared-test-helpers.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as service from "../service.js";
import { useTemplateHandler } from "../controller.js";

describe("useTemplateHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for invalid id", async () => {
    const req: any = { params: { id: "abc" } };
    const res = mockResponse();

    await useTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 401 when requester is missing", async () => {
    const req: any = { params: { id: "1" }, headers: {}, cookies: {} };
    const res = mockResponse();

    await useTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(service.usePublicTemplate).not.toHaveBeenCalled();
  });

  it("returns 404 when source public template is not found", async () => {
    (service.usePublicTemplate as any).mockResolvedValue(null);

    const req: any = { params: { id: "2" }, user: { sub: 3 } };
    const res = mockResponse();

    await useTemplateHandler(req, res);

    expect(service.usePublicTemplate).toHaveBeenCalledWith(3, 2);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns ok with copied template id", async () => {
    (service.usePublicTemplate as any).mockResolvedValue({ id: 99 });

    const req: any = { params: { id: "2" }, user: { sub: 3 } };
    const res = mockResponse();

    await useTemplateHandler(req, res);

    expect(service.usePublicTemplate).toHaveBeenCalledWith(3, 2);
    expect(res.json).toHaveBeenCalledWith({ ok: true, templateID: 99 });
  });

  it("returns 500 for non-auth errors", async () => {
    (service.usePublicTemplate as any).mockRejectedValue(new Error("boom"));

    const req: any = { params: { id: "2" }, user: { sub: 3 } };
    const res = mockResponse();

    await useTemplateHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
