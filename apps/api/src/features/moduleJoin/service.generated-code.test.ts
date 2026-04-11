import { describe, expect, it, vi } from "vitest";
import { withGeneratedModuleJoinCode } from "./service.js";

describe("moduleJoin generated code retries", () => {
  it("retries on join-code unique conflicts and succeeds", async () => {
    const write = vi
      .fn()
      .mockRejectedValueOnce({ code: "P2002", meta: { target: ["enterpriseId", "joinCode"] } })
      .mockResolvedValueOnce({ id: 22 });

    await expect(withGeneratedModuleJoinCode("ent-1", write, 2)).resolves.toEqual({ id: 22 });
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("rethrows non-P2002 errors immediately", async () => {
    const write = vi.fn().mockRejectedValueOnce(new Error("db down"));
    await expect(withGeneratedModuleJoinCode("ent-1", write, 3)).rejects.toThrow("db down");
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("rethrows P2002 with wrong target meta without retry", async () => {
    const write = vi.fn().mockRejectedValueOnce({ code: "P2002", meta: { target: ["otherField"] } });
    await expect(withGeneratedModuleJoinCode("ent-1", write, 3)).rejects.toEqual(
      expect.objectContaining({ code: "P2002", meta: { target: ["otherField"] } }),
    );
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("rethrows P2002 on final attempt", async () => {
    const write = vi
      .fn()
      .mockRejectedValue({ code: "P2002", meta: { target: ["enterpriseId", "joinCode"] } });
    await expect(withGeneratedModuleJoinCode("ent-1", write, 2)).rejects.toEqual(
      expect.objectContaining({ code: "P2002" }),
    );
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("throws terminal generation error when maxAttempts is zero", async () => {
    const write = vi.fn();
    await expect(withGeneratedModuleJoinCode("ent-1", write, 0)).rejects.toThrow(
      "Failed to generate module join code for enterprise ent-1",
    );
    expect(write).not.toHaveBeenCalled();
  });
});
