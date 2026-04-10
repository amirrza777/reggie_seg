import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
}));

vi.mock("../../../shared/email.js", () => ({ sendEmail: mocks.sendEmail }));

import {
  buildProjectTeamWorkspaceUrl,
  mapAllocationDraftTeamForResponse,
  notifyStudentsAboutApprovedDraftTeam,
  notifyStudentsAboutManualAllocation,
  parseExpectedUpdatedAt,
} from "./service.drafts.helpers.js";

describe("service.drafts.helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendEmail.mockResolvedValue(undefined);
  });

  it("buildProjectTeamWorkspaceUrl trims trailing slash", () => {
    expect(buildProjectTeamWorkspaceUrl(7, "https://app.example.com/")).toBe("https://app.example.com/projects/7/team");
  });

  it("mapAllocationDraftTeamForResponse serializes date fields", () => {
    const mapped = mapAllocationDraftTeamForResponse({
      id: 3,
      teamName: "Blue",
      memberCount: 1,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      draftCreatedBy: null,
      members: [{ id: 8, firstName: "A", lastName: "B", email: "a@b.com" }],
    });
    expect(mapped.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(mapped.updatedAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("parseExpectedUpdatedAt returns undefined when omitted", () => {
    expect(parseExpectedUpdatedAt(undefined)).toBeUndefined();
  });

  it.each([12, "", "not-a-date"])("parseExpectedUpdatedAt rejects invalid value %p", (raw) => {
    expect(() => parseExpectedUpdatedAt(raw)).toThrowError();
  });

  it("notifyStudentsAboutManualAllocation sends one email per student", async () => {
    await notifyStudentsAboutManualAllocation(4, "Project", "Blue", [
      { firstName: "Ada", email: "ada@example.com" },
      { firstName: "Bob", email: "bob@example.com" },
    ]);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "ada@example.com" }));
  });

  it("notifyStudentsAboutManualAllocation logs failures and continues", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.sendEmail.mockRejectedValueOnce(new Error("smtp down"));
    await notifyStudentsAboutManualAllocation(4, "Project", "Blue", [{ firstName: "Ada", email: "ada@example.com" }]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("notifyStudentsAboutApprovedDraftTeam reuses manual notification logic", async () => {
    await notifyStudentsAboutApprovedDraftTeam(4, "Project", "Blue", [{ firstName: "Ada", email: "ada@example.com" }]);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });
});