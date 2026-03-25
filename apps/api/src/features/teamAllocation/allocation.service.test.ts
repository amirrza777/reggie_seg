import { describe, expect, it } from "vitest";
import {
  applyManualAllocationForProject,
  applyRandomAllocationForProject,
  previewRandomAllocationForProject,
} from "./allocation.service.js";

describe("allocation.service", () => {
  it("rejects preview when teamCount is not a positive integer", async () => {
    await expect(previewRandomAllocationForProject(1, 2, 0)).rejects.toMatchObject({ code: "INVALID_TEAM_COUNT" });
  });

  it("rejects random apply when teamCount is invalid", async () => {
    await expect(applyRandomAllocationForProject(1, 2, -1)).rejects.toMatchObject({ code: "INVALID_TEAM_COUNT" });
  });

  it("rejects manual apply when teamName is blank", async () => {
    await expect(applyManualAllocationForProject(1, 2, { teamName: "   ", studentIds: [1] })).rejects.toMatchObject({
      code: "INVALID_TEAM_NAME",
    });
  });

  it("rejects manual apply when student IDs contain duplicates", async () => {
    await expect(applyManualAllocationForProject(1, 2, { teamName: "Team A", studentIds: [4, 4] })).rejects.toMatchObject({
      code: "INVALID_STUDENT_IDS",
    });
  });
});