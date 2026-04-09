import { beforeEach, describe, expect, it, vi } from "vitest";
import { findAssessmentDueDateForTeam } from "./repo.js";
import { prisma } from "../../../shared/db.js";

vi.mock("../../../shared/db.js", () => ({
  prisma: {
    team: {
      findUnique: vi.fn(),
    },
  },
}));

describe("peerAssessment/staff repo deadlines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findAssessmentDueDateForTeam prefers team override, then project deadline, and handles nulls", async () => {
    const overrideDate = new Date("2026-04-01T10:00:00.000Z");
    const projectDate = new Date("2026-04-05T10:00:00.000Z");

    (prisma.team.findUnique as any).mockResolvedValueOnce({
      deadlineOverride: { assessmentDueDate: overrideDate },
      project: { deadline: { assessmentDueDate: projectDate } },
    });
    await expect(findAssessmentDueDateForTeam(1)).resolves.toEqual(overrideDate);

    (prisma.team.findUnique as any).mockResolvedValueOnce({
      deadlineOverride: null,
      project: { deadline: { assessmentDueDate: projectDate } },
    });
    await expect(findAssessmentDueDateForTeam(1)).resolves.toEqual(projectDate);

    (prisma.team.findUnique as any).mockResolvedValueOnce({
      deadlineOverride: null,
      project: { deadline: null },
    });
    await expect(findAssessmentDueDateForTeam(1)).resolves.toBeNull();

    (prisma.team.findUnique as any).mockResolvedValueOnce(null);
    await expect(findAssessmentDueDateForTeam(1)).resolves.toBeNull();

    expect(prisma.team.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        deadlineOverride: { select: { assessmentDueDate: true } },
        project: { select: { deadline: { select: { assessmentDueDate: true } } } },
      },
    });
  });
});

