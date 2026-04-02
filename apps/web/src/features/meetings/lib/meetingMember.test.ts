import { isMeetingMember } from "./meetingMember";

describe("isMeetingMember", () => {
  const allocations = [
    { user: { id: 1 } },
    { user: { id: 2 } },
    { user: { id: 3 } },
  ];

  it("returns true when user is in the allocations", () => {
    expect(isMeetingMember(allocations, 2)).toBe(true);
  });

  it("returns false when user is not in the allocations", () => {
    expect(isMeetingMember(allocations, 99)).toBe(false);
  });

  it("returns false for empty allocations", () => {
    expect(isMeetingMember([], 1)).toBe(false);
  });
});
