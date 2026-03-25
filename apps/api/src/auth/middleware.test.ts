import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { optionalAuth, requireAuth } from "./middleware.js";

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

  it("accepts a string subject and includes admin flag when boolean", () => {
    vi.spyOn(jwt, "verify").mockReturnValue({ sub: "7", email: "admin@example.com", admin: true } as any);
    const res = mockRes();
    const req: any = { headers: { authorization: "Bearer good" } };

    requireAuth(req, res, next);

    expect(req.user).toEqual({ sub: 7, email: "admin@example.com", admin: true });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("rejects non-object payloads", () => {
    vi.spyOn(jwt, "verify").mockReturnValue("not-an-object" as any);
    const res = mockRes();

    requireAuth({ headers: { authorization: "Bearer bad" } } as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid access token" });
  });

  it("rejects invalid subject values", () => {
    vi.spyOn(jwt, "verify").mockReturnValue({ sub: "abc", email: "test@example.com" } as any);
    const res = mockRes();

    requireAuth({ headers: { authorization: "Bearer bad-sub" } } as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid access token" });
  });

  it("rejects missing or empty email", () => {
    vi.spyOn(jwt, "verify").mockReturnValue({ sub: 3, email: "" } as any);
    const res = mockRes();

    requireAuth({ headers: { authorization: "Bearer bad-email" } } as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid access token" });
  });
});

describe("optionalAuth", () => {
  it("does nothing when authorization header is missing", () => {
    const req: any = { headers: {} };
    const res = mockRes();
    const verifySpy = vi.spyOn(jwt, "verify");

    optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(verifySpy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("ignores non-bearer authorization values", () => {
    const req: any = { headers: { authorization: "Basic abc123" } };
    const res = mockRes();
    const verifySpy = vi.spyOn(jwt, "verify");

    optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(verifySpy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("swallows invalid tokens and still calls next", () => {
    vi.spyOn(jwt, "verify").mockImplementation(() => {
      throw new Error("expired");
    });
    const req: any = { headers: { authorization: "Bearer expired" } };
    const res = mockRes();

    optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("attaches user for a valid bearer token", () => {
    vi.spyOn(jwt, "verify").mockReturnValue({ sub: 9, email: "optional@example.com", admin: false } as any);
    const req: any = { headers: { authorization: "Bearer valid" } };
    const res = mockRes();

    optionalAuth(req, res, next);

    expect(req.user).toEqual({ sub: 9, email: "optional@example.com", admin: false });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
