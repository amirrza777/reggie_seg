import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { requireAuth } from "./middleware.js";

const mockRes = () => {
  const res = { status: vi.fn(), json: vi.fn() } as any;
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
};

const next = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  next.mockReset();
});

describe("requireAuth", () => {
  it("returns 401 when token is missing", () => {
    const res = mockRes();
    requireAuth({ headers: {} } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing access token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects invalid bearer token", () => {
    vi.spyOn(jwt, "verify").mockImplementation(() => {
      throw new Error("bad");
    });
    const res = mockRes();
    requireAuth({ headers: { authorization: "Bearer nope" } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid access token" });
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches payload and calls next on valid token", () => {
    vi.spyOn(jwt, "verify").mockReturnValue({ sub: 3, email: "test@example.com" } as any);
    const res = mockRes();
    const req: any = { headers: { authorization: "Bearer good" } };
    requireAuth(req, res, next);
    expect(req.user).toEqual({ sub: 3, email: "test@example.com" });
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
