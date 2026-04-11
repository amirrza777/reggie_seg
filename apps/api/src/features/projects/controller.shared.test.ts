import { describe, expect, it, vi } from "vitest";
import { isTeamLifecycleMigrationError, parsePositiveInt, resolveAuthenticatedUserId } from "./controller.shared.js";

function createRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  } as any;
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe("projects controller.shared", () => {
  it("parses positive integers from numbers and strings", () => {
    expect(parsePositiveInt(5)).toBe(5);
    expect(parsePositiveInt("7")).toBe(7);
  });

  it("returns null for invalid positive integer values", () => {
    expect(parsePositiveInt("0")).toBeNull();
    expect(parsePositiveInt("-1")).toBeNull();
    expect(parsePositiveInt("abc")).toBeNull();
    expect(parsePositiveInt(2.4)).toBeNull();
  });

  it("resolves authenticated user id and validates optional query userId", () => {
    const successRes = createRes();
    expect(resolveAuthenticatedUserId({ user: { sub: 42 }, query: {} } as any, successRes)).toBe(42);

    const invalidQueryRes = createRes();
    expect(resolveAuthenticatedUserId({ user: { sub: 42 }, query: { userId: "abc" } } as any, invalidQueryRes)).toBeNull();
    expect(invalidQueryRes.status).toHaveBeenCalledWith(400);

    const mismatchedQueryRes = createRes();
    expect(resolveAuthenticatedUserId({ user: { sub: 42 }, query: { userId: "43" } } as any, mismatchedQueryRes)).toBeNull();
    expect(mismatchedQueryRes.status).toHaveBeenCalledWith(403);

    const unauthenticatedRes = createRes();
    expect(resolveAuthenticatedUserId({ query: {} } as any, unauthenticatedRes)).toBeNull();
    expect(unauthenticatedRes.status).toHaveBeenCalledWith(401);
  });

  it("detects team lifecycle migration prisma errors", () => {
    expect(isTeamLifecycleMigrationError({ code: "P2021" })).toBe(true);
    expect(isTeamLifecycleMigrationError({ code: "P2022" })).toBe(true);
    expect(isTeamLifecycleMigrationError({ code: "P2002" })).toBe(false);
    expect(isTeamLifecycleMigrationError(null)).toBe(false);
  });
});
