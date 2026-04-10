import { describe, expect, it } from "vitest";
import {
  parseAddUserToTeamBody,
  parseCreateTeamForProjectBody,
  parseCreateTeamInviteBody,
  parseDraftExpectedUpdatedAtBody,
  parseDraftTeamIdParam,
  parseInviteIdParam,
  parseManualAllocationBody,
  parseManualAllocationWorkspaceQuery,
  parseProjectIdParam,
  parseRandomAllocationApplyBody,
  parseRandomAllocationPreviewQuery,
  parseStaffActor,
  parseTeamIdParam,
  parseUpdateDraftBody,
} from "./controller.parsers.js";

describe("teamAllocation controller parsers", () => {
  it("parses staff actor and reports unauthorized", () => {
    expect(parseStaffActor({ user: { sub: 9 } } as any)).toEqual({ ok: true, value: 9 });
    expect(parseStaffActor({ user: undefined } as any)).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("parses id params with specific error messages", () => {
    expect(parseProjectIdParam("4")).toEqual({ ok: true, value: 4 });
    expect(parseProjectIdParam("x")).toEqual({ ok: false, error: "Invalid project ID" });
    expect(parseTeamIdParam("5")).toEqual({ ok: true, value: 5 });
    expect(parseTeamIdParam("x")).toEqual({ ok: false, error: "Invalid team ID" });
    expect(parseDraftTeamIdParam("6")).toEqual({ ok: true, value: 6 });
    expect(parseDraftTeamIdParam("x")).toEqual({ ok: false, error: "Invalid draft team ID" });
  });

  it("parses manual allocation workspace query and validates q", () => {
    expect(parseManualAllocationWorkspaceQuery({ q: "  keyword " })).toEqual({ ok: true, value: "keyword" });
    expect(parseManualAllocationWorkspaceQuery({})).toEqual({ ok: true, value: null });
    expect(parseManualAllocationWorkspaceQuery(null)).toEqual({ ok: true, value: null });
    expect(parseManualAllocationWorkspaceQuery({ q: 1 })).toEqual({
      ok: false,
      error: "q must be a string with up to 120 characters",
    });
  });

  it("parses random allocation preview query including min/max constraints", () => {
    expect(parseRandomAllocationPreviewQuery({ teamCount: "3", minTeamSize: "2", maxTeamSize: 5 })).toEqual({
      ok: true,
      value: { teamCount: 3, minTeamSize: 2, maxTeamSize: 5 },
    });
    expect(parseRandomAllocationPreviewQuery({ teamCount: 0 })).toEqual({
      ok: false,
      error: "teamCount must be a positive integer",
    });
    expect(parseRandomAllocationPreviewQuery({ teamCount: 3, minTeamSize: "x" })).toEqual({
      ok: false,
      error: "minTeamSize must be a positive integer when provided",
    });
    expect(parseRandomAllocationPreviewQuery({ teamCount: 3, maxTeamSize: "x" })).toEqual({
      ok: false,
      error: "maxTeamSize must be a positive integer when provided",
    });
    expect(parseRandomAllocationPreviewQuery({ teamCount: 3, minTeamSize: 5, maxTeamSize: 2 })).toEqual({
      ok: false,
      error: "minTeamSize cannot be greater than maxTeamSize",
    });
    expect(parseRandomAllocationPreviewQuery({ teamCount: 3 })).toEqual({
      ok: true,
      value: { teamCount: 3 },
    });
    expect(parseRandomAllocationPreviewQuery(null)).toEqual({
      ok: false,
      error: "teamCount must be a positive integer",
    });
  });

  it("parses random allocation apply body and trims team names", () => {
    expect(
      parseRandomAllocationApplyBody({
        teamCount: "3",
        teamNames: ["  Alpha ", "Beta"],
        minTeamSize: "2",
        maxTeamSize: 5,
      }),
    ).toEqual({
      ok: true,
      value: { teamCount: 3, teamNames: ["Alpha", "Beta"], minTeamSize: 2, maxTeamSize: 5 },
    });
    expect(parseRandomAllocationApplyBody({ teamCount: 0 })).toEqual({
      ok: false,
      error: "teamCount must be a positive integer",
    });
    expect(parseRandomAllocationApplyBody({ teamCount: 3, teamNames: [1] })).toEqual({
      ok: false,
      error: "teamNames must be an array of strings when provided",
    });
    expect(parseRandomAllocationApplyBody({ teamCount: 3, minTeamSize: "x" })).toEqual({
      ok: false,
      error: "minTeamSize must be a positive integer when provided",
    });
    expect(parseRandomAllocationApplyBody({ teamCount: 3, maxTeamSize: "x" })).toEqual({
      ok: false,
      error: "maxTeamSize must be a positive integer when provided",
    });
    expect(parseRandomAllocationApplyBody({ teamCount: 3, minTeamSize: 5, maxTeamSize: 2 })).toEqual({
      ok: false,
      error: "minTeamSize cannot be greater than maxTeamSize",
    });
    expect(parseRandomAllocationApplyBody({ teamCount: 3 })).toEqual({
      ok: true,
      value: { teamCount: 3 },
    });
    expect(parseRandomAllocationApplyBody(null)).toEqual({
      ok: false,
      error: "teamCount must be a positive integer",
    });
  });

  it("parses manual allocation body", () => {
    expect(parseManualAllocationBody({ teamName: "A", studentIds: [1, "2"] })).toEqual({
      ok: true,
      value: { teamName: "A", studentIds: [1, 2] },
    });
    expect(parseManualAllocationBody({ teamName: "A", studentIds: "x" })).toEqual({
      ok: false,
      error: "studentIds must be an array of numbers",
    });
    expect(parseManualAllocationBody({ teamName: "A", studentIds: [1, "x"] })).toEqual({
      ok: false,
      error: "studentIds must be an array of numbers",
    });
    expect(parseManualAllocationBody({ studentIds: [1, 2] })).toEqual({
      ok: true,
      value: { teamName: "", studentIds: [1, 2] },
    });
    expect(parseManualAllocationBody(null)).toEqual({
      ok: false,
      error: "studentIds must be an array of numbers",
    });
  });

  it("parses create team for project body", () => {
    expect(parseCreateTeamForProjectBody({ projectId: "8", teamName: " Team A " })).toEqual({
      ok: true,
      value: { projectId: 8, teamName: "Team A" },
    });
    expect(parseCreateTeamForProjectBody({ projectId: "x", teamName: "" })).toEqual({
      ok: false,
      error: "Invalid request body",
    });
    expect(parseCreateTeamForProjectBody(null)).toEqual({
      ok: false,
      error: "Invalid request body",
    });
  });

  it("parses create invite body including optional inviteeId/message", () => {
    expect(parseCreateTeamInviteBody({ teamId: 3, inviteeEmail: "a@b.com", inviteeId: "9", message: "Hi" })).toEqual({
      ok: true,
      value: { teamId: 3, inviteeEmail: "a@b.com", inviteeId: 9, message: "Hi" },
    });
    expect(parseCreateTeamInviteBody({ teamId: "x", inviteeEmail: "a@b.com" })).toEqual({
      ok: false,
      error: "Invalid request body",
    });
    expect(parseCreateTeamInviteBody({ teamId: 3, inviteeEmail: "" })).toEqual({
      ok: false,
      error: "Invalid request body",
    });
    expect(parseCreateTeamInviteBody({ teamId: 3, inviteeEmail: 123 })).toEqual({
      ok: false,
      error: "Invalid request body",
    });
    expect(parseCreateTeamInviteBody({ teamId: 3, inviteeEmail: "a@b.com", inviteeId: "x" })).toEqual({
      ok: false,
      error: "Invalid request body",
    });
    expect(parseCreateTeamInviteBody({ teamId: 3, inviteeEmail: "a@b.com" })).toEqual({
      ok: true,
      value: { teamId: 3, inviteeEmail: "a@b.com" },
    });
    expect(parseCreateTeamInviteBody({ teamId: 3, inviteeEmail: "a@b.com", message: 123 })).toEqual({
      ok: true,
      value: { teamId: 3, inviteeEmail: "a@b.com" },
    });
    expect(parseCreateTeamInviteBody(null)).toEqual({
      ok: false,
      error: "Invalid request body",
    });
  });

  it("parses invite id param", () => {
    expect(parseInviteIdParam("  invite-1 ")).toEqual({ ok: true, value: "invite-1" });
    expect(parseInviteIdParam("")).toEqual({ ok: false, error: "Invalid invite ID" });
    expect(parseInviteIdParam(7)).toEqual({ ok: false, error: "Invalid invite ID" });
  });

  it("parses expectedUpdatedAt payload", () => {
    expect(parseDraftExpectedUpdatedAtBody({})).toEqual({ ok: true, value: {} });
    expect(parseDraftExpectedUpdatedAtBody({ expectedUpdatedAt: "2026-01-01T00:00:00.000Z" })).toEqual({
      ok: true,
      value: { expectedUpdatedAt: "2026-01-01T00:00:00.000Z" },
    });
    expect(parseDraftExpectedUpdatedAtBody({ expectedUpdatedAt: 123 })).toEqual({
      ok: false,
      error: "expectedUpdatedAt must be an ISO datetime string when provided",
    });
    expect(parseDraftExpectedUpdatedAtBody(null)).toEqual({ ok: true, value: {} });
  });

  it("parses update draft body and validates each branch", () => {
    expect(parseUpdateDraftBody({})).toEqual({
      ok: false,
      error: "Provide teamName and/or studentIds to update draft",
    });
    expect(parseUpdateDraftBody({ teamName: 1 })).toEqual({
      ok: false,
      error: "teamName must be a non-empty string when provided",
    });
    expect(parseUpdateDraftBody({ studentIds: "x" })).toEqual({
      ok: false,
      error: "studentIds must be an array of numbers when provided",
    });
    expect(parseUpdateDraftBody({ expectedUpdatedAt: 1, teamName: "A" })).toEqual({
      ok: false,
      error: "expectedUpdatedAt must be an ISO datetime string when provided",
    });
    expect(parseUpdateDraftBody({ studentIds: [1, "x"] })).toEqual({
      ok: false,
      error: "studentIds must be an array of numbers when provided",
    });
    expect(
      parseUpdateDraftBody({
        teamName: "Team A",
      }),
    ).toEqual({
      ok: true,
      value: { teamName: "Team A" },
    });
    expect(
      parseUpdateDraftBody({
        teamName: "Team A",
        studentIds: [1, "2"],
        expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toEqual({
      ok: true,
      value: { teamName: "Team A", studentIds: [1, 2], expectedUpdatedAt: "2026-01-01T00:00:00.000Z" },
    });
    expect(parseUpdateDraftBody({ studentIds: [1, 2] })).toEqual({
      ok: true,
      value: { studentIds: [1, 2] },
    });
    expect(parseUpdateDraftBody(null)).toEqual({
      ok: false,
      error: "Provide teamName and/or studentIds to update draft",
    });
  });

  it("parses add user body and normalizes role", () => {
    expect(parseAddUserToTeamBody({ userId: "7", role: "owner" })).toEqual({
      ok: true,
      value: { userId: 7, role: "OWNER" },
    });
    expect(parseAddUserToTeamBody({ userId: "7", role: "member" })).toEqual({
      ok: true,
      value: { userId: 7, role: "MEMBER" },
    });
    expect(parseAddUserToTeamBody({ userId: "x" })).toEqual({
      ok: false,
      error: "Invalid request body",
    });
    expect(parseAddUserToTeamBody({ userId: "7" })).toEqual({
      ok: true,
      value: { userId: 7, role: "MEMBER" },
    });
    expect(parseAddUserToTeamBody(null)).toEqual({
      ok: false,
      error: "Invalid request body",
    });
  });
});