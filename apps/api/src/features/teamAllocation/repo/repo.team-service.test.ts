import { describe, expect, it } from "vitest";
import { createTeam, createTeamForProject } from "../service/service.js";

describe("service team validation", () => {
  it("rejects invalid project id in createTeam", async () => {
    await expect(createTeam(1, { projectId: 0, teamName: "X" } as any)).rejects.toEqual({
      code: "INVALID_PROJECT_ID",
    });
  });

  it("rejects empty team names", async () => {
    await expect(createTeam(1, { projectId: 2, teamName: " " } as any)).rejects.toEqual({
      code: "INVALID_TEAM_NAME",
    });
    await expect(createTeamForProject(1, 2, " ")).rejects.toEqual({ code: "INVALID_TEAM_NAME" });
  });
});