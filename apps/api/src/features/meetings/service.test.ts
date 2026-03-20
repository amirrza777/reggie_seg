import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listMeetings,
  fetchMeeting,
  addMeeting,
  removeMeeting,
  markAttendance,
  saveMinutes,
  addComment,
  removeComment,
} from "./service.js";

import * as repo from "./repo.js";

vi.mock("./repo.js", () => ({
  getMeetingsByTeamId: vi.fn(),
  getMeetingById: vi.fn(),
  createMeeting: vi.fn(),
  getTeamMeetingState: vi.fn(),
  clearTeamInactivityFlag: vi.fn(),
  deleteMeeting: vi.fn(),
  bulkUpsertAttendance: vi.fn(),
  upsertMinutes: vi.fn(),
  createComment: vi.fn(),
  deleteComment: vi.fn(),
}));

describe("meetings service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards listMeetings to repo", async () => {
    (repo.getMeetingsByTeamId as any).mockResolvedValue([{ id: 1 }]);

    const result = await listMeetings(5);

    expect(repo.getMeetingsByTeamId).toHaveBeenCalledWith(5);
    expect(result).toEqual([{ id: 1 }]);
  });

  it("forwards fetchMeeting to repo", async () => {
    (repo.getMeetingById as any).mockResolvedValue({ id: 10 });

    const result = await fetchMeeting(10);

    expect(repo.getMeetingById).toHaveBeenCalledWith(10);
    expect(result).toEqual({ id: 10 });
  });

  it("forwards addMeeting to repo", async () => {
    const data = {
      teamId: 1,
      organiserId: 1,
      title: "Team Meeting",
      date: new Date("2026-03-01"),
    };
    (repo.getTeamMeetingState as any).mockResolvedValue({ archivedAt: null, inactivityFlag: "NONE" });
    (repo.createMeeting as any).mockResolvedValue({ id: 3 });

    const result = await addMeeting(data);

    expect(repo.getTeamMeetingState).toHaveBeenCalledWith(1);
    expect(repo.createMeeting).toHaveBeenCalledWith(data);
    expect(result).toEqual({ id: 3 });
  });

  it("forwards removeMeeting to repo", async () => {
    await removeMeeting(7);

    expect(repo.deleteMeeting).toHaveBeenCalledWith(7);
  });

  it("forwards markAttendance to repo", async () => {
    const records = [{ userId: 1, status: "Present" }];

    await markAttendance(3, records);

    expect(repo.bulkUpsertAttendance).toHaveBeenCalledWith(3, records);
  });

  it("forwards saveMinutes to repo", async () => {
    await saveMinutes(5, 1, "some notes");

    expect(repo.upsertMinutes).toHaveBeenCalledWith(5, 1, "some notes");
  });

  it("forwards addComment to repo", async () => {
    await addComment(5, 1, "looks good");

    expect(repo.createComment).toHaveBeenCalledWith(5, 1, "looks good");
  });

  it("forwards removeComment to repo", async () => {
    await removeComment(12);

    expect(repo.deleteComment).toHaveBeenCalledWith(12);
  });
});
