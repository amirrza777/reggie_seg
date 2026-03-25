import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./invite.service.js";

describe("invite.service", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["createTeamInvite","listTeamInvites","listReceivedInvites","acceptTeamInvite","declineTeamInvite","rejectTeamInvite","cancelTeamInvite","expireTeamInvite"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});