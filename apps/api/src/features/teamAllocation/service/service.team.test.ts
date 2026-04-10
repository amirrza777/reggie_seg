import { describe, expect, it } from "vitest";
import { createTeam, createTeamForProject } from "./service.team.js";

describe("service.team", () => {
  it("rejects invalid project id in createTeam", async () => {
    await expect(createTeam(4, { projectId: "x", teamName: "Team A" } as any)).rejects.toMatchObject({
      code: "INVALID_PROJECT_ID",
    });
  });

  it("rejects empty team names", async () => {
    await expect(createTeam(4, { projectId: 2, teamName: "   " } as any)).rejects.toMatchObject({
      code: "INVALID_TEAM_NAME",
    });
    await expect(createTeamForProject(4, 2, " ")).rejects.toMatchObject({ code: "INVALID_TEAM_NAME" });
  });
});