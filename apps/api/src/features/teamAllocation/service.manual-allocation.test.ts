import { describe, expect, it } from "vitest";
import { applyManualAllocationForProject, createTeamForProject } from "./service.js";

describe("service manual allocation", () => {
  it("rejects empty team name", async () => {
    await expect(
      applyManualAllocationForProject(1, 2, { teamName: "   ", studentIds: [1, 2] }),
    ).rejects.toEqual({ code: "INVALID_TEAM_NAME" });
  });

  it("rejects invalid or duplicate student ids", async () => {
    await expect(
      applyManualAllocationForProject(1, 2, { teamName: "Team A", studentIds: [1, 1] }),
    ).rejects.toEqual({ code: "INVALID_STUDENT_IDS" });

    await expect(
      applyManualAllocationForProject(1, 2, { teamName: "Team A", studentIds: [1, -2] }),
    ).rejects.toEqual({ code: "INVALID_STUDENT_IDS" });
  });

  it("validates createTeamForProject team name", async () => {
    await expect(createTeamForProject(1, 2, " ")).rejects.toEqual({ code: "INVALID_TEAM_NAME" });
  });
});