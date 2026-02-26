import { describe, expect, it } from "vitest";
import { GithubServiceError } from "./errors.js";

describe("GithubServiceError", () => {
  it("stores status and message like a normal Error", () => {
    const error = new GithubServiceError(403, "Forbidden");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(GithubServiceError);
    expect(error.status).toBe(403);
    expect(error.message).toBe("Forbidden");
  });
});

