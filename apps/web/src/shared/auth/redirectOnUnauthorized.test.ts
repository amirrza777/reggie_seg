import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/errors";
import { redirectOnUnauthorized } from "./redirectOnUnauthorized";

class RedirectSentinel extends Error {
  path: string;
  constructor(path: string) {
    super(`redirect:${path}`);
    this.path = path;
  }
}

const redirectMock = vi.fn((path: string) => {
  throw new RedirectSentinel(path);
});

vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

describe("redirectOnUnauthorized", () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it("redirects to login for ApiError 401", () => {
    expect(() => redirectOnUnauthorized(new ApiError("Unauthorized", { status: 401 }))).toThrowError(
      RedirectSentinel,
    );
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("does not redirect for non-401 errors", () => {
    expect(redirectOnUnauthorized(new ApiError("Forbidden", { status: 403 }))).toBe(false);
    expect(redirectOnUnauthorized(new Error("boom"))).toBe(false);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
