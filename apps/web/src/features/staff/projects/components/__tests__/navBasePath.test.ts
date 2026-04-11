import { describe, expect, it } from "vitest";
import {
  decodePathSegment,
  inferModuleIdFromStaffProjectPath,
  resolveStaffProjectBasePath,
  resolveStaffTeamBasePath,
} from "../navBasePath";

describe("navBasePath", () => {
  it("decodes module id path segments and preserves invalid encodings", () => {
    expect(decodePathSegment("MOD%20123")).toBe("MOD 123");
    expect(decodePathSegment(undefined)).toBe("");
    expect(decodePathSegment("%E0%A4%A")).toBe("%E0%A4%A");
  });

  it("infers module id only for staff module project routes", () => {
    expect(inferModuleIdFromStaffProjectPath("/staff/modules/MOD%20123/projects/proj_1")).toBe("MOD 123");
    expect(inferModuleIdFromStaffProjectPath("/staff/projects/proj_1")).toBeNull();
    expect(inferModuleIdFromStaffProjectPath("/staff/modules//projects/proj_1")).toBeNull();
    expect(inferModuleIdFromStaffProjectPath(undefined)).toBeNull();
  });

  it("builds encoded base paths for projects and teams", () => {
    expect(resolveStaffProjectBasePath({ projectId: "project id/1" })).toBe("/staff/projects/project%20id%2F1");
    expect(resolveStaffTeamBasePath({ projectId: "project 1", teamId: "team/2" })).toBe(
      "/staff/projects/project%201/teams/team%2F2",
    );
  });
});
