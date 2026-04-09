import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiFetch } from "@/shared/api/http";
import {
  listMeetings,
  getMeeting,
  listTeamMembers,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  markAttendance,
  saveMinutes,
  addComment,
  deleteComment,
  getMeetingSettings,
  getTeamMeetingSettings,
} from "./client";

vi.mock("@/shared/api/http", () => ({
  apiFetch: vi.fn(),
}));

describe("meetings api client", () => {
  const apiFetchMock = vi.mocked(apiFetch);

  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({} as any);
  });

  it("lists meetings for a team", async () => {
    await listMeetings(5);
    expect(apiFetchMock).toHaveBeenCalledWith("/meetings/team/5");
  });

  it("gets a single meeting", async () => {
    await getMeeting(12);
    expect(apiFetchMock).toHaveBeenCalledWith("/meetings/12");
  });

  it("creates a meeting", async () => {
    const data = {
      teamId: 1,
      organiserId: 2,
      title: "Team Review",
      date: "2026-03-01T10:00",
    };
    await createMeeting(data);
    expect(apiFetchMock).toHaveBeenCalledWith("/meetings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

  it("creates a meeting with optional fields", async () => {
    const data = {
      teamId: 1,
      organiserId: 2,
      title: "Team Review",
      date: "2026-03-01T10:00",
      subject: "MVP progress",
      location: "Room 301",
      agenda: "Trello + progress",
    };
    await createMeeting(data);
    expect(apiFetchMock).toHaveBeenCalledWith("/meetings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

  it("updates a meeting", async () => {
    const data = {
      title: "Retrospective",
      participantIds: [1, 2, 3],
    };
    await updateMeeting(12, 7, data);
    expect(apiFetchMock).toHaveBeenCalledWith("/meetings/12", {
      method: "PATCH",
      body: JSON.stringify({ userId: 7, ...data }),
    });
  });

  it("deletes a meeting", async () => {
    await deleteMeeting(12);
    expect(apiFetchMock).toHaveBeenCalledWith("/meetings/12", {
      method: "DELETE",
    });
  });

  it("lists team members", async () => {
    await listTeamMembers(5);
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/teams/5/members");
  });

  it("marks attendance", async () => {
    const records = [
      { userId: 1, status: "on_time" },
      { userId: 2, status: "late" },
    ];
    await markAttendance(5, records);
    expect(apiFetchMock).toHaveBeenCalledWith("/meetings/5/attendance", {
      method: "PUT",
      body: JSON.stringify({ records }),
    });
  });

  it("saves minutes", async () => {
    await saveMinutes(5, 2, '{"root":{}}');
    expect(apiFetchMock).toHaveBeenCalledWith("/meetings/5/minutes", {
      method: "PUT",
      body: JSON.stringify({ writerId: 2, content: '{"root":{}}' }),
    });
  });

  it("adds a comment", async () => {
    await addComment(5, 2, "Looks good");
    expect(apiFetchMock).toHaveBeenCalledWith("/meetings/5/comments", {
      method: "POST",
      body: JSON.stringify({ userId: 2, content: "Looks good" }),
    });
  });

  it("adds a comment with team context", async () => {
    await addComment(5, 2, "Looks good", 77);
    expect(apiFetchMock).toHaveBeenCalledWith("/meetings/5/comments", {
      method: "POST",
      body: JSON.stringify({ userId: 2, content: "Looks good", teamId: 77 }),
    });
  });

  it("deletes a comment", async () => {
    await deleteComment(99);
    expect(apiFetchMock).toHaveBeenCalledWith("/meetings/comments/99", {
      method: "DELETE",
    });
  });

  it("returns apiFetch results", async () => {
    apiFetchMock.mockResolvedValueOnce([{ id: 1 }] as any);
    const result = await listMeetings(5);
    expect(result).toEqual([{ id: 1 }]);
  });

  it("gets meeting settings", async () => {
    await getMeetingSettings(55);
    expect(apiFetchMock).toHaveBeenCalledWith("/meetings/55/settings");
  });

  it("gets team meeting settings", async () => {
    await getTeamMeetingSettings(8);
    expect(apiFetchMock).toHaveBeenCalledWith("/meetings/team/8/settings");
  });
});
