import { describe, expect, it } from "vitest";
import { toJsonSafe, withQuery } from "./controller.utils.js";

describe("controller utils", () => {
  it("converts bigint values to numbers recursively", () => {
    expect(
      toJsonSafe({
        id: BigInt(12),
        nested: { repoId: BigInt(34) },
        items: [BigInt(56)],
      })
    ).toEqual({
      id: 12,
      nested: { repoId: 34 },
      items: [56],
    });
  });

  it("appends query params to relative paths and overwrites existing keys", () => {
    expect(withQuery("/modules?github=old", { github: "connected", reason: "ok" })).toBe(
      "/modules?github=connected&reason=ok"
    );
  });

  it("appends query params to absolute URLs", () => {
    expect(withQuery("http://127.0.0.1:3001/projects/1/repos?tab=repositories", { github: "connected" })).toBe(
      "http://127.0.0.1:3001/projects/1/repos?tab=repositories&github=connected"
    );
  });
});

