import { describe, expect, it } from "vitest";
import {
  applyRandomAllocationForProject,
  previewRandomAllocationForProject,
} from "./service.random.js";

describe("service.random", () => {
  it.each([0, -1, 1.5])("rejects invalid preview teamCount %p", async (teamCount) => {
    await expect(previewRandomAllocationForProject(1, 2, teamCount as number)).rejects.toMatchObject({
      code: "INVALID_TEAM_COUNT",
    });
  });

  it("rejects mismatched teamNames length", async () => {
    await expect(applyRandomAllocationForProject(1, 2, 3, { teamNames: ["A", "B"] })).rejects.toMatchObject({
      code: "INVALID_TEAM_NAMES",
    });
  });

  it("rejects duplicate team names", async () => {
    await expect(applyRandomAllocationForProject(1, 2, 2, { teamNames: ["Team A", "team a"] })).rejects.toMatchObject({
      code: "DUPLICATE_TEAM_NAMES",
    });
  });
});