import { describe, expect, it } from "vitest";
import {
  formatActorRole,
  isEditableCandidate,
  toAllocationDraftFullName,
} from "./useStaffAllocationDraftsPanel";

describe("toAllocationDraftFullName", () => {
  it("returns trimmed full name when both first and last name are present", () => {
    expect(toAllocationDraftFullName({ firstName: "Jin", lastName: "Lee", email: "jin@example.com" })).toBe("Jin Lee");
  });

  it("falls back to email when both first and last name are empty", () => {
    expect(toAllocationDraftFullName({ firstName: "", lastName: "", email: "jin@example.com" })).toBe("jin@example.com");
  });

  it("falls back to email when both names are whitespace", () => {
    expect(toAllocationDraftFullName({ firstName: " ", lastName: " ", email: "a@b.com" })).toBe("a@b.com");
  });

  it("returns just the first name when last name is absent", () => {
    expect(toAllocationDraftFullName({ firstName: "Ali", lastName: "", email: "ali@example.com" })).toBe("Ali");
  });
});

describe("formatActorRole", () => {
  it("returns 'Enterprise admin' for ENTERPRISE_ADMIN", () => {
    expect(formatActorRole("ENTERPRISE_ADMIN")).toBe("Enterprise admin");
  });

  it("returns 'Admin' for ADMIN", () => {
    expect(formatActorRole("ADMIN")).toBe("Admin");
  });

  it("returns 'Staff' for any other role", () => {
    expect(formatActorRole("STAFF")).toBe("Staff");
    expect(formatActorRole("TEACHING_ASSISTANT")).toBe("Staff");
  });
});

describe("isEditableCandidate", () => {
  it("returns true for an available student regardless of draftTeamId", () => {
    const student = { status: "AVAILABLE", currentTeam: null } as any;
    expect(isEditableCandidate(student, 10)).toBe(true);
  });

  it("returns true when the student is already in the target draft team", () => {
    const student = { status: "ASSIGNED", currentTeam: { id: 10, teamName: "Draft 1" } } as any;
    expect(isEditableCandidate(student, 10)).toBe(true);
  });

  it("returns false when the student is in a different draft team", () => {
    const student = { status: "ASSIGNED", currentTeam: { id: 99, teamName: "Other" } } as any;
    expect(isEditableCandidate(student, 10)).toBe(false);
  });

  it("returns false when the student has no currentTeam and status is not AVAILABLE", () => {
    const student = { status: "ASSIGNED", currentTeam: null } as any;
    expect(isEditableCandidate(student, 10)).toBe(false);
  });
});