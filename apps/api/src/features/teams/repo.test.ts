import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn() },
    team: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("../../shared/db.js", () => ({
  prisma: mocks.prisma,
}));

import { dismissTeamFlag, findTeamById, findUserRoleById } from "./repo.js";

describe("teams repo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findUserRoleById queries by id and selects role", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ role: "STAFF" });
    await findUserRoleById(3);
    expect(mocks.prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 3 },
      select: { role: true },
    });
  });

  it("findTeamById queries by id and selects id only", async () => {
    mocks.prisma.team.findUnique.mockResolvedValue({ id: 4 });
    await findTeamById(4);
    expect(mocks.prisma.team.findUnique).toHaveBeenCalledWith({
      where: { id: 4 },
      select: { id: true },
    });
  });

  it("dismissTeamFlag resets inactivityFlag to NONE", async () => {
    mocks.prisma.team.update.mockResolvedValue({ id: 4, inactivityFlag: "NONE" });
    await dismissTeamFlag(4);
    expect(mocks.prisma.team.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { inactivityFlag: "NONE" },
    });
  });
});
