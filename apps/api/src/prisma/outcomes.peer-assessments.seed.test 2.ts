import { beforeEach, describe, expect, it } from "vitest";

import { prismaMock, resetOutcomesSeedMocks } from "./outcomes.seed.shared";
import { seedPeerAssessments } from "../../prisma/seed/outcomes";

describe("outcomes seeder peer assessments", () => {
  beforeEach(() => {
    resetOutcomesSeedMocks();
  });

  it("skips missing projects/templates and teams with invalid setup", async () => {
    await seedPeerAssessments([], [{ id: 10, projectId: 100 }], [{ id: 1, questionLabels: ["Q1"] }] as any);
    await seedPeerAssessments([{ id: 100, moduleId: 1, templateId: 1 }], [], []);

    prismaMock.teamAllocation.findMany.mockResolvedValue([{ user: { id: 1 } }]);
    await seedPeerAssessments(
      [{ id: 100, moduleId: 1, templateId: 999 }],
      [{ id: 10, projectId: 100 }],
      [{ id: 1, questionLabels: ["Q1"] }] as any,
    );
    expect(prismaMock.peerAssessment.create).not.toHaveBeenCalled();
  });

  it("creates/updates assessments and upserts feedback", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([
      { user: { id: 1 } },
      { user: { id: 2 } },
    ]);
    prismaMock.peerAssessment.findMany.mockResolvedValue([{ id: 77, reviewerUserId: 1, revieweeUserId: 2 }]);
    prismaMock.peerFeedback.findMany.mockResolvedValue([{ peerAssessmentId: 77 }]);
    prismaMock.peerAssessment.update.mockResolvedValue({ id: 77 });
    prismaMock.peerAssessment.create.mockResolvedValue({ id: 88 });

    await seedPeerAssessments(
      [{ id: 100, moduleId: 1, templateId: 1 }],
      [{ id: 10, projectId: 100 }],
      [{ id: 1, questionLabels: ["Technical", "Communication"] }] as any,
    );

    expect(prismaMock.peerAssessment.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.peerAssessment.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.peerFeedback.upsert).toHaveBeenCalledTimes(2);
  });

  it("skips falsy reviewer/reviewee ids", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([
      { user: { id: 0 } },
      { user: { id: 2 } },
    ]);
    prismaMock.peerAssessment.findMany.mockResolvedValue([]);
    prismaMock.peerFeedback.findMany.mockResolvedValue([]);

    await seedPeerAssessments(
      [{ id: 100, moduleId: 1, templateId: 1 }],
      [{ id: 10, projectId: 100 }],
      [{ id: 1, questionLabels: ["Q1"] }] as any,
    );

    expect(prismaMock.peerAssessment.create).not.toHaveBeenCalled();
    expect(prismaMock.peerFeedback.upsert).not.toHaveBeenCalled();
  });

  it("skips teams when project template mapping is missing", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([
      { user: { id: 1 } },
      { user: { id: 2 } },
    ]);

    await seedPeerAssessments(
      [{ id: 100, moduleId: 1, templateId: 1 }],
      [{ id: 10, projectId: 999 }],
      [{ id: 1, questionLabels: ["Q1"] }] as any,
    );

    expect(prismaMock.peerAssessment.create).not.toHaveBeenCalled();
    expect(prismaMock.peerAssessment.update).not.toHaveBeenCalled();
  });

  it("skips teams with fewer than two members", async () => {
    prismaMock.teamAllocation.findMany.mockResolvedValue([{ user: { id: 1 } }]);

    await seedPeerAssessments(
      [{ id: 100, moduleId: 1, templateId: 1 }],
      [{ id: 10, projectId: 100 }],
      [{ id: 1, questionLabels: ["Q1"] }] as any,
    );

    expect(prismaMock.peerAssessment.create).not.toHaveBeenCalled();
    expect(prismaMock.peerAssessment.update).not.toHaveBeenCalled();
  });
});
