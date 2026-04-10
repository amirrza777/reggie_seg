import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("../../../shared/db.js", () => ({ prisma: mocks.prisma }));

import { approveDraftTeam, deleteDraftTeam, updateDraftTeam } from "./repo.drafts.writes.js";

type Tx = {
  team: {
    findFirst: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  teamAllocation: {
    deleteMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

function createTx(): Tx {
  return {
    team: { findFirst: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
    teamAllocation: { deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
  };
}

describe("repo.drafts.writes", () => {
  let tx: Tx;

  beforeEach(() => {
    vi.clearAllMocks();
    tx = createTx();
    mocks.prisma.$transaction.mockImplementation(async (work: (client: Tx) => unknown) => work(tx));
  });

  it("updateDraftTeam throws when draft does not exist", async () => {
    tx.team.findFirst.mockResolvedValue(null);
    await expect(updateDraftTeam(3, { teamName: "Blue" })).rejects.toEqual({ code: "DRAFT_TEAM_NOT_FOUND" });
  });

  it("updateDraftTeam throws when expectedUpdatedAt mismatches", async () => {
    tx.team.findFirst.mockResolvedValue({ id: 3, updatedAt: new Date("2026-01-01T00:00:00.000Z") });
    await expect(
      updateDraftTeam(3, { teamName: "Blue", expectedUpdatedAt: new Date("2026-01-02T00:00:00.000Z") }),
    ).rejects.toEqual({ code: "DRAFT_OUTDATED" });
  });

  it("updateDraftTeam throws when optimistic update fails", async () => {
    tx.team.findFirst.mockResolvedValue({ id: 3, updatedAt: new Date("2026-01-01T00:00:00.000Z") });
    tx.team.updateMany.mockResolvedValue({ count: 0 });
    await expect(updateDraftTeam(3, { teamName: "Blue" })).rejects.toEqual({ code: "DRAFT_OUTDATED" });
  });

  it("updateDraftTeam updates team and student allocations", async () => {
    tx.team.findFirst.mockResolvedValueOnce({ id: 3, updatedAt: new Date("2026-01-01T00:00:00.000Z") });
    tx.team.findFirst.mockResolvedValueOnce({ id: 3 });
    tx.team.updateMany.mockResolvedValue({ count: 1 });
    tx.team.findUnique.mockResolvedValue({ id: 3, teamName: "Blue", _count: { allocations: 2 } });
    const result = await updateDraftTeam(3, { teamName: "Blue", studentIds: [5, 6] });
    expect(result).toEqual({ id: 3, teamName: "Blue", memberCount: 2 });
    expect(tx.teamAllocation.createMany).toHaveBeenCalled();
  });

  it("updateDraftTeam throws TEAM_NOT_FOUND when final row disappears", async () => {
    tx.team.findFirst.mockResolvedValue({ id: 3, updatedAt: new Date("2026-01-01T00:00:00.000Z") });
    tx.team.updateMany.mockResolvedValue({ count: 1 });
    tx.team.findUnique.mockResolvedValue(null);
    await expect(updateDraftTeam(3, { teamName: "Blue" })).rejects.toEqual({ code: "TEAM_NOT_FOUND" });
  });

  it("deleteDraftTeam returns null when draft does not exist", async () => {
    tx.team.findFirst.mockResolvedValue(null);
    await expect(deleteDraftTeam(4)).resolves.toBeNull();
  });

  it("deleteDraftTeam throws when expectedUpdatedAt mismatches", async () => {
    tx.team.findFirst.mockResolvedValue({ id: 4, teamName: "Blue", updatedAt: new Date("2026-01-01T00:00:00.000Z") });
    await expect(deleteDraftTeam(4, { expectedUpdatedAt: new Date("2026-01-02T00:00:00.000Z") })).rejects.toEqual({
      code: "DRAFT_OUTDATED",
    });
  });

  it("deleteDraftTeam returns deleted draft summary", async () => {
    tx.team.findFirst.mockResolvedValue({ id: 4, teamName: "Blue", updatedAt: new Date("2026-01-01T00:00:00.000Z") });
    tx.team.updateMany.mockResolvedValue({ count: 1 });
    await expect(deleteDraftTeam(4)).resolves.toEqual({ id: 4, teamName: "Blue" });
  });

  it("approveDraftTeam returns null when draft does not exist", async () => {
    tx.team.findFirst.mockResolvedValue(null);
    await expect(approveDraftTeam(7, 9)).resolves.toBeNull();
  });

  it("approveDraftTeam throws when active conflicts exist", async () => {
    tx.team.findFirst.mockResolvedValue({ id: 7, projectId: 11, updatedAt: new Date("2026-01-01T00:00:00.000Z") });
    tx.teamAllocation.findMany.mockResolvedValueOnce([{ userId: 3 }]);
    tx.teamAllocation.findMany.mockResolvedValueOnce([{ userId: 3 }]);
    await expect(approveDraftTeam(7, 9)).rejects.toEqual({ code: "STUDENTS_NO_LONGER_AVAILABLE" });
  });

  it("approveDraftTeam maps approved team payload", async () => {
    tx.team.findFirst.mockResolvedValue({ id: 7, projectId: 11, updatedAt: new Date("2026-01-01T00:00:00.000Z") });
    tx.teamAllocation.findMany.mockResolvedValueOnce([{ userId: 3 }]);
    tx.teamAllocation.findMany.mockResolvedValueOnce([]);
    tx.team.updateMany.mockResolvedValue({ count: 1 });
    tx.team.findUnique.mockResolvedValue({
      id: 7,
      teamName: "Blue",
      allocations: [{ user: { id: 3, firstName: "A", lastName: "B", email: "a@b.com" } }],
      _count: { allocations: 1 },
    });
    const approved = await approveDraftTeam(7, 9);
    expect(approved).toEqual(expect.objectContaining({ id: 7, teamName: "Blue", memberCount: 1 }));
  });
});