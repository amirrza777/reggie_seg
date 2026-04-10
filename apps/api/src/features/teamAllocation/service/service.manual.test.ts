import { describe, expect, it } from "vitest";
import { applyManualAllocationForProject } from "./service.manual.js";

describe("service.manual", () => {
  it("rejects empty team names", async () => {
    await expect(applyManualAllocationForProject(1, 2, { teamName: "", studentIds: [1] })).rejects.toMatchObject({
      code: "INVALID_TEAM_NAME",
    });
  });

  it("rejects non-positive and duplicate student ids", async () => {
    await expect(applyManualAllocationForProject(1, 2, { teamName: "Team A", studentIds: [0] })).rejects.toMatchObject({
      code: "INVALID_STUDENT_IDS",
    });
    await expect(applyManualAllocationForProject(1, 2, { teamName: "Team A", studentIds: [2, 2] })).rejects.toMatchObject({
      code: "INVALID_STUDENT_IDS",
    });
  });
});