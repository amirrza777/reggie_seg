import { describe, it, expect, vi, beforeEach } from "vitest";
import { addComment, removeComment } from "../service.js";

import * as repo from "../repo.js";
import * as teamAllocationService from "../../teamAllocation/service/service.js";
import * as notificationsService from "../../notifications/service.js";
import { prisma } from "../../../shared/db.js";

vi.mock("../repo.js", () => ({
  getMeetingById: vi.fn(),
  createComment: vi.fn(),
  deleteComment: vi.fn(),
  createMentions: vi.fn(),
}));

vi.mock("../../teamAllocation/service/service.js", () => ({
  getTeamMembers: vi.fn(),
  getTeamById: vi.fn(),
}));

vi.mock("../../notifications/service.js", () => ({
  addNotification: vi.fn(),
}));

vi.mock("../../../shared/projectWriteGuard.js", () => ({
  assertProjectMutableForWritesByTeamId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../shared/db.js", () => ({
  prisma: {
    meetingComment: {
      findUnique: vi.fn(),
    },
  },
}));

describe("meetings comments service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards addComment to repo", async () => {
    (repo.getMeetingById as any).mockResolvedValue({ id: 5, teamId: 1 });
    (repo.createComment as any).mockResolvedValue({ id: 1 });

    await addComment(5, 1, "looks good");

    expect(repo.createComment).toHaveBeenCalledWith(5, 1, "looks good");
  });

  it("does not process mentions when no teamId provided", async () => {
    (repo.getMeetingById as any).mockResolvedValue({ id: 5, teamId: 1 });
    (repo.createComment as any).mockResolvedValue({ id: 1 });

    await addComment(5, 1, "@Bob Jones hello");

    expect(repo.createMentions).not.toHaveBeenCalled();
  });

  it("creates mentions and notifies mentioned users when teamId provided", async () => {
    (repo.getMeetingById as any).mockResolvedValue({ id: 1, teamId: 1 });
    (repo.createComment as any).mockResolvedValue({ id: 5 });
    (teamAllocationService.getTeamMembers as any).mockResolvedValue([
      { id: 2, firstName: "Bob", lastName: "Jones", email: "b@test.com" },
    ]);
    (teamAllocationService.getTeamById as any).mockResolvedValue({ projectId: 10 });
    (repo.createMentions as any).mockResolvedValue(undefined);

    await addComment(1, 1, "@Bob Jones hello", 5);

    expect(repo.createMentions).toHaveBeenCalledWith(5, [2]);
    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 2, type: "MENTION" })
    );
  });

  it("skips ambiguous full-name mentions when multiple members share the same name", async () => {
    (repo.getMeetingById as any).mockResolvedValue({ id: 1, teamId: 1 });
    (repo.createComment as any).mockResolvedValue({ id: 5 });
    (teamAllocationService.getTeamMembers as any).mockResolvedValue([
      { id: 2, firstName: "Bob", lastName: "Jones", email: "b1@test.com" },
      { id: 3, firstName: "Bob", lastName: "Jones", email: "b2@test.com" },
    ]);
    (teamAllocationService.getTeamById as any).mockResolvedValue({ projectId: 10 });
    (repo.createMentions as any).mockResolvedValue(undefined);

    await addComment(1, 1, "@Bob Jones please review", 5);

    expect(repo.createMentions).not.toHaveBeenCalled();
    expect(notificationsService.addNotification).not.toHaveBeenCalled();
  });

  it("returns comment even when mention processing fails", async () => {
    (repo.getMeetingById as any).mockResolvedValue({ id: 1, teamId: 1 });
    (repo.createComment as any).mockResolvedValue({ id: 5 });
    (teamAllocationService.getTeamMembers as any).mockRejectedValue(new Error("mention fail"));

    const result = await addComment(1, 1, "@Bob Jones hello", 5);

    expect(result).toEqual({ id: 5 });
  });

  it("forwards removeComment to repo", async () => {
    (prisma.meetingComment.findUnique as any).mockResolvedValue({
      meeting: { teamId: 1 },
    });

    await removeComment(12);

    expect(repo.deleteComment).toHaveBeenCalledWith(12);
  });
});