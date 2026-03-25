import { describe, expect, it } from "vitest";
import * as moduleUnderTest from "./controller.invites.js";

describe("controller.invites", () => {
  it("loads as a module", () => {
    expect(moduleUnderTest).toBeTypeOf("object");
  });

  it.each(["createTeamInviteHandler","listTeamInvitesHandler","listReceivedInvitesHandler","acceptTeamInviteHandler","declineTeamInviteHandler","rejectTeamInviteHandler","cancelTeamInviteHandler","expireTeamInviteHandler"])("exposes %s", (name) => {
    expect(moduleUnderTest).toHaveProperty(name);
  });
});