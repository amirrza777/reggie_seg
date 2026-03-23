import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./invite.service.js";

const expectedFunctionExports = [
  "createTeamInvite",
  "listTeamInvites",
  "listReceivedInvites",
  "acceptTeamInvite",
  "declineTeamInvite",
  "rejectTeamInvite",
  "cancelTeamInvite",
  "expireTeamInvite",
] as const;

const expectedValueExports: string[] = [];

function getNamedExport(name: string) {
  return (moduleUnderTest as Record<string, unknown>)[name];
}

describe("invite.service", () => {
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