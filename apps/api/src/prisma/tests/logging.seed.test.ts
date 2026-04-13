import { describe, expect, it, vi } from "vitest";

import { withSeedLogging } from "../../../prisma/seed/logging";

describe("withSeedLogging", () => {
  it("logs success with singular row wording and details", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const value = await withSeedLogging("seedStep", async () => ({
      value: 42,
      rows: 1,
      details: "custom details",
    }));

    expect(value).toBe(42);
    expect(logSpy).toHaveBeenCalledWith("[seed] seedStep: success (1 row seeded; custom details)");
    logSpy.mockRestore();
  });

  it("logs success with plural row wording and without details", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await withSeedLogging("seedStep", async () => ({
      value: "ok",
      rows: 3,
    }));

    expect(logSpy).toHaveBeenCalledWith("[seed] seedStep: success (3 rows seeded)");
    logSpy.mockRestore();
  });

  it("logs and rethrows errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("boom");

    await expect(
      withSeedLogging("seedStep", async () => {
        throw failure;
      }),
    ).rejects.toThrow("boom");

    expect(errorSpy).toHaveBeenCalledWith("[seed] seedStep: failed", failure);
    errorSpy.mockRestore();
  });
});
