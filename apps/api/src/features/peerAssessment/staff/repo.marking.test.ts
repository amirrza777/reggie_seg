import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  findStudentMarking,
  findTeamMarking,
  isStudentInTeam,
  upsertStudentMarking,
  upsertTeamMarking,
} from "./repo.js";
import { prisma } from "../../../shared/db.js";

vi.mock("../../../shared/db.js", () => ({
  prisma: {
    teamAllocation: {
      count: vi.fn(),
    },
    staffTeamMarking: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    staffStudentMarking: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

describe("peerAssessment/staff repo marking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findTeamMarking and findStudentMarking query expected selectors", async () => {
    await findTeamMarking(10);
    expect(prisma.staffTeamMarking.findUnique).toHaveBeenCalledWith({
      where: { teamId: 10 },
      select: {
        mark: true,
        formativeFeedback: true,
        updatedAt: true,
        marker: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await findStudentMarking(10, 22);
    expect(prisma.staffStudentMarking.findUnique).toHaveBeenCalledWith({
      where: {
        teamId_studentUserId: { teamId: 10, studentUserId: 22 },
      },
      select: {
        mark: true,
        formativeFeedback: true,
        updatedAt: true,
        marker: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  });

  it("isStudentInTeam returns boolean from teamAllocation count", async () => {
    (prisma.teamAllocation.count as any).mockResolvedValueOnce(1);
    await expect(isStudentInTeam(7, 9)).resolves.toBe(true);
    expect(prisma.teamAllocation.count).toHaveBeenCalledWith({
      where: { teamId: 7, userId: 9 },
    });

    (prisma.teamAllocation.count as any).mockResolvedValueOnce(0);
    await expect(isStudentInTeam(7, 9)).resolves.toBe(false);
  });

  it("upsertTeamMarking writes expected payload and returns selected fields", async () => {
    const payload = {
      teamId: 3,
      markerUserId: 8,
      mark: 74,
      formativeFeedback: "Good structure",
    } as const;

    await upsertTeamMarking(payload);

    expect(prisma.staffTeamMarking.upsert).toHaveBeenCalledWith({
      where: { teamId: payload.teamId },
      create: {
        teamId: payload.teamId,
        markerUserId: payload.markerUserId,
        mark: payload.mark,
        formativeFeedback: payload.formativeFeedback,
      },
      update: {
        markerUserId: payload.markerUserId,
        mark: payload.mark,
        formativeFeedback: payload.formativeFeedback,
      },
      select: {
        mark: true,
        formativeFeedback: true,
        updatedAt: true,
        marker: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  });

  it("upsertStudentMarking writes expected payload and returns selected fields", async () => {
    const payload = {
      teamId: 3,
      studentUserId: 11,
      markerUserId: 8,
      mark: 81,
      formativeFeedback: "Improved contribution",
    } as const;

    await upsertStudentMarking(payload);

    expect(prisma.staffStudentMarking.upsert).toHaveBeenCalledWith({
      where: {
        teamId_studentUserId: {
          teamId: payload.teamId,
          studentUserId: payload.studentUserId,
        },
      },
      create: {
        teamId: payload.teamId,
        studentUserId: payload.studentUserId,
        markerUserId: payload.markerUserId,
        mark: payload.mark,
        formativeFeedback: payload.formativeFeedback,
      },
      update: {
        markerUserId: payload.markerUserId,
        mark: payload.mark,
        formativeFeedback: payload.formativeFeedback,
      },
      select: {
        mark: true,
        formativeFeedback: true,
        updatedAt: true,
        marker: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  });
});

