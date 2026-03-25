import { describe, expect, it } from "vitest";
import { applyRandomAllocationForProject, previewRandomAllocationForProject } from "./service.js";

describe("service random allocation", () => {
  it.each([0, -1, 1.5])("rejects invalid preview teamCount %p", async (teamCount) => {
    await expect(previewRandomAllocationForProject(1, 2, teamCount as number)).rejects.toEqual({
      code: "INVALID_TEAM_COUNT",
    });
  });

  it("rejects invalid apply teamCount", async () => {
    await expect(applyRandomAllocationForProject(1, 2, 0)).rejects.toEqual({ code: "INVALID_TEAM_COUNT" });
  });

  it("rejects invalid teamNames length", async () => {
    await expect(
      applyRandomAllocationForProject(1, 2, 2, { teamNames: ["Only one"] }),
    ).rejects.toEqual({ code: "INVALID_TEAM_NAMES" });
  });

  it("rejects duplicate teamNames", async () => {
    await expect(
      applyRandomAllocationForProject(1, 2, 2, { teamNames: ["Team", "team"] }),
    ).rejects.toEqual({ code: "DUPLICATE_TEAM_NAMES" });
  });
});