import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./controller.invites.js";

const expectedFunctionExports = [
  "createTeamInviteHandler",
  "listTeamInvitesHandler",
  "listInviteEligibleStudentsHandler",
  "listReceivedInvitesHandler",
  "acceptTeamInviteHandler",
  "declineTeamInviteHandler",
  "rejectTeamInviteHandler",
  "cancelTeamInviteHandler",
  "expireTeamInviteHandler",
] as const;

const expectedValueExports: string[] = [];

function getNamedExport(name: string) {
  return (moduleUnderTest as Record<string, unknown>)[name];
}

describe("controller.invites", () => {
  it("exposes callable runtime functions", () => {
    for (const name of expectedFunctionExports) {
      expect(getNamedExport(name)).toBeTypeOf("function");
    }
  });

  it("exposes expected runtime values", () => {
    for (const name of expectedValueExports) {
      expect(getNamedExport(name)).toBeDefined();
    }
  });

  it("includes the expected export names", () => {
    const expectedNames = [...expectedFunctionExports, ...expectedValueExports];
    expect(Object.keys(moduleUnderTest)).toEqual(expect.arrayContaining(expectedNames));
  });
});