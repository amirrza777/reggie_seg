import { describe, it, expect, vi, beforeEach } from "vitest";
import { addComment, removeComment } from "./service.js";

import * as repo from "./repo.js";
import * as teamAllocationService from "../teamAllocation/service.js";
import * as notificationsService from "../notifications/service.js";

vi.mock("./repo.js", () => ({
  createComment: vi.fn(),
  deleteComment: vi.fn(),
  createMentions: vi.fn(),
}));

vi.mock("../teamAllocation/service.js", () => ({
  getTeamMembers: vi.fn(),
  getTeamById: vi.fn(),
}));

vi.mock("../notifications/service.js", () => ({
  addNotification: vi.fn(),
}));

describe("meetings comments service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards addComment to repo", async () => {
    (repo.createComment as any).mockResolvedValue({ id: 1 });

    await addComment(5, 1, "looks good");

    expect(repo.createComment).toHaveBeenCalledWith(5, 1, "looks good");
  });

  it("does not process mentions when no teamId provided", async () => {
    (repo.createComment as any).mockResolvedValue({ id: 1 });

    await addComment(5, 1, "@Bob Jones hello");

    expect(repo.createMentions).not.toHaveBeenCalled();
  });

  it("creates mentions and notifies mentioned users when teamId provided", async () => {
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

  it("forwards removeComment to repo", async () => {
    await removeComment(12);

    expect(repo.deleteComment).toHaveBeenCalledWith(12);
  });
});
