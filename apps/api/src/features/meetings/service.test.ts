import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listMeetings,
  fetchMeeting,
  addMeeting,
  editMeeting,
  removeMeeting,
  markAttendance,
  saveMinutes,
  addComment,
  removeComment,
  fetchMeetingSettings,
  parseMentions,
} from "./service.js";

import * as repo from "./repo.js";
import * as teamAllocationService from "../teamAllocation/service.js";
import * as email from "../../shared/email.js";
import * as notificationsService from "../notifications/service.js";

vi.mock("./repo.js", () => ({
  getMeetingsByTeamId: vi.fn(),
  getMeetingById: vi.fn(),
  createMeeting: vi.fn(),
  updateMeeting: vi.fn(),
  replaceParticipants: vi.fn(),
  createParticipants: vi.fn(),
  getTeamMeetingState: vi.fn(),
  clearTeamInactivityFlag: vi.fn(),
  deleteMeeting: vi.fn(),
  bulkUpsertAttendance: vi.fn(),
  upsertMinutes: vi.fn(),
  createComment: vi.fn(),
  deleteComment: vi.fn(),
  createMentions: vi.fn(),
  getRecentAttendanceForUser: vi.fn(),
  getModuleLeadsForTeam: vi.fn(),
  getModuleMeetingSettingsForTeam: vi.fn(),
}));

vi.mock("../teamAllocation/service.js", () => ({
  getTeamMembers: vi.fn(),
  getTeamById: vi.fn(),
}));

vi.mock("../../shared/email.js", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("../notifications/service.js", () => ({
  addNotification: vi.fn(),
}));

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

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

  it("creates meeting and participants for all members when no participantIds", async () => {
    const members = [
      { id: 1, email: "a@test.com" },
      { id: 2, email: "b@test.com" },
    ];
    (repo.getTeamMeetingState as any).mockResolvedValue({ archivedAt: null, inactivityFlag: "NONE" });
    (repo.createMeeting as any).mockResolvedValue({ id: 3 });
    (teamAllocationService.getTeamMembers as any).mockResolvedValue(members);
    (repo.createParticipants as any).mockResolvedValue(undefined);
    (email.sendEmail as any).mockResolvedValue(undefined);

    const result = await addMeeting({ teamId: 1, organiserId: 1, title: "Team Meeting", date: new Date("2026-03-01") });

    expect(repo.createMeeting).toHaveBeenCalledWith({ teamId: 1, organiserId: 1, title: "Team Meeting", date: new Date("2026-03-01") });
    expect(repo.createParticipants).toHaveBeenCalledWith(3, [1, 2]);
    expect(result).toEqual({ id: 3 });
  });

  it("rejects addMeeting when project is completed", async () => {
    const data = {
      teamId: 1,
      organiserId: 1,
      title: "Late Meeting",
      date: new Date("2026-03-01"),
    };
    (repo.getTeamMeetingState as any).mockResolvedValue({
      archivedAt: null,
      inactivityFlag: "NONE",
      deadlineProfile: "STANDARD",
      deadlineOverride: null,
      project: {
        archivedAt: null,
        deadline: {
          feedbackDueDate: new Date("2020-01-01T00:00:00.000Z"),
          feedbackDueDateMcf: null,
        },
      },
    });

    await expect(addMeeting(data)).rejects.toEqual({ code: "PROJECT_COMPLETED" });
    expect(repo.createMeeting).not.toHaveBeenCalled();
  });

  it("creates participants only for invited members when participantIds provided", async () => {
    const members = [
      { id: 1, email: "a@test.com" },
      { id: 2, email: "b@test.com" },
      { id: 3, email: "c@test.com" },
    ];
    (repo.getTeamMeetingState as any).mockResolvedValue({ archivedAt: null, inactivityFlag: "NONE" });
    (repo.createMeeting as any).mockResolvedValue({ id: 5 });
    (teamAllocationService.getTeamMembers as any).mockResolvedValue(members);
    (repo.createParticipants as any).mockResolvedValue(undefined);
    (email.sendEmail as any).mockResolvedValue(undefined);

    await addMeeting({ teamId: 1, organiserId: 1, title: "Team Meeting", date: new Date("2026-03-01"), participantIds: [1, 3] });

    expect(repo.createParticipants).toHaveBeenCalledWith(5, [1, 3]);
  });

  it("sends invite email with ics attachment to each participant", async () => {
    const members = [{ id: 1, email: "a@test.com" }];
    (repo.getTeamMeetingState as any).mockResolvedValue({ archivedAt: null, inactivityFlag: "NONE" });
    (repo.createMeeting as any).mockResolvedValue({ id: 1 });
    (teamAllocationService.getTeamMembers as any).mockResolvedValue(members);
    (repo.createParticipants as any).mockResolvedValue(undefined);
    (email.sendEmail as any).mockResolvedValue(undefined);

    await addMeeting({ teamId: 1, organiserId: 1, title: "Sprint Review", date: new Date("2026-05-01T14:00:00Z") });

    expect(email.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "a@test.com",
        attachments: expect.arrayContaining([
          expect.objectContaining({ filename: "meeting.ics" }),
        ]),
      })
    );
  });

  it("sends invite email only to selected participants when participantIds provided", async () => {
    const members = [
      { id: 1, email: "a@test.com" },
      { id: 2, email: "b@test.com" },
    ];
    (repo.getTeamMeetingState as any).mockResolvedValue({ archivedAt: null, inactivityFlag: "NONE" });
    (repo.createMeeting as any).mockResolvedValue({ id: 2 });
    (teamAllocationService.getTeamMembers as any).mockResolvedValue(members);
    (repo.createParticipants as any).mockResolvedValue(undefined);
    (email.sendEmail as any).mockResolvedValue(undefined);

    await addMeeting({ teamId: 1, organiserId: 1, title: "Team Meeting", date: new Date("2026-05-01"), participantIds: [1] });

    expect(email.sendEmail).toHaveBeenCalledTimes(1);
    expect(email.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "a@test.com" }));
  });

  it("clears inactivity flag when team has YELLOW flag", async () => {
    const members = [{ id: 1, email: "a@test.com" }];
    (repo.getTeamMeetingState as any).mockResolvedValue({ archivedAt: null, inactivityFlag: "YELLOW" });
    (repo.createMeeting as any).mockResolvedValue({ id: 1 });
    (teamAllocationService.getTeamMembers as any).mockResolvedValue(members);
    (repo.createParticipants as any).mockResolvedValue(undefined);
    (email.sendEmail as any).mockResolvedValue(undefined);

    await addMeeting({ teamId: 1, organiserId: 1, title: "Team Meeting", date: new Date("2026-05-01") });

    expect(repo.clearTeamInactivityFlag).toHaveBeenCalledWith(1);
  });

  it("throws TEAM_ARCHIVED when team is archived", async () => {
    (repo.getTeamMeetingState as any).mockResolvedValue({ archivedAt: new Date(), inactivityFlag: "NONE" });

    await expect(
      addMeeting({ teamId: 1, organiserId: 1, title: "Team Meeting", date: new Date("2026-03-01") })
    ).rejects.toEqual({ code: "TEAM_ARCHIVED" });
  });

  it("throws NOT_FOUND from editMeeting when meeting does not exist", async () => {
    (repo.getMeetingById as any).mockResolvedValue(null);

    await expect(editMeeting(1, 1, { title: "Updated" })).rejects.toEqual({ code: "NOT_FOUND" });
  });

  it("throws FORBIDDEN from editMeeting when user is not the organiser and toggle is off", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 1, teamId: 1, organiserId: 2, date: tomorrow, team: { allocations: [] },
    });
    (repo.getModuleMeetingSettingsForTeam as any).mockResolvedValue({ allowAnyoneToEditMeetings: false });

    await expect(editMeeting(1, 1, { title: "Updated" })).rejects.toEqual({ code: "FORBIDDEN" });
  });

  it("allows non-organiser to edit when toggle is on and user is a team member", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 1, teamId: 1, organiserId: 2, date: tomorrow, team: { allocations: [{ userId: 1 }] },
    });
    (repo.getModuleMeetingSettingsForTeam as any).mockResolvedValue({ allowAnyoneToEditMeetings: true });
    (repo.updateMeeting as any).mockResolvedValue({ id: 1, title: "Updated" });

    expect(await editMeeting(1, 1, { title: "Updated" })).toEqual({ id: 1, title: "Updated" });
  });

  it("throws FORBIDDEN from editMeeting when toggle is on but user is not a team member", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 1, teamId: 1, organiserId: 2, date: tomorrow, team: { allocations: [] },
    });
    (repo.getModuleMeetingSettingsForTeam as any).mockResolvedValue({ allowAnyoneToEditMeetings: true });

    await expect(editMeeting(1, 1, { title: "Updated" })).rejects.toEqual({ code: "FORBIDDEN" });
  });

  it("throws MEETING_PASSED from editMeeting when meeting date has passed", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 1,
      organiserId: 1,
      date: yesterday,
    });

    await expect(editMeeting(1, 1, { title: "Updated" })).rejects.toEqual({ code: "MEETING_PASSED" });
  });

  it("returns updated meeting from editMeeting on success", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 1,
      organiserId: 1,
      date: tomorrow,
    });
    (repo.updateMeeting as any).mockResolvedValue({ id: 1, title: "Updated" });

    const result = await editMeeting(1, 1, { title: "Updated" });

    expect(repo.updateMeeting).toHaveBeenCalledWith(1, { title: "Updated" });
    expect(result).toEqual({ id: 1, title: "Updated" });
  });

  it("replaces participants when participantIds provided in editMeeting", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 1,
      organiserId: 1,
      date: tomorrow,
    });
    (repo.updateMeeting as any).mockResolvedValue({ id: 1, title: "Updated" });

    await editMeeting(1, 1, { title: "Updated", participantIds: [2, 3] });

    expect(repo.replaceParticipants).toHaveBeenCalledWith(1, [2, 3]);
  });

  it("does not replace participants when participantIds not provided in editMeeting", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 1,
      organiserId: 1,
      date: tomorrow,
    });
    (repo.updateMeeting as any).mockResolvedValue({ id: 1, title: "Updated" });

    await editMeeting(1, 1, { title: "Updated" });

    expect(repo.replaceParticipants).not.toHaveBeenCalled();
  });

  it("forwards removeMeeting to repo", async () => {
    await removeMeeting(7);

    expect(repo.deleteMeeting).toHaveBeenCalledWith(7);
  });

  it("forwards markAttendance to repo", async () => {
    const records = [{ userId: 1, status: "Present" }];
    (repo.getMeetingById as any).mockResolvedValue(null);

    await markAttendance(3, records);

    expect(repo.bulkUpsertAttendance).toHaveBeenCalledWith(3, records);
  });

  it("does not notify when no records have absent status", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 3,
      teamId: 1,
      team: { projectId: 10, teamName: "Team A", allocations: [] },
    });
    (repo.getModuleMeetingSettingsForTeam as any).mockResolvedValue({ absenceThreshold: 2, minutesEditWindowDays: 7 });
    (repo.getModuleLeadsForTeam as any).mockResolvedValue([]);

    await markAttendance(3, [{ userId: 1, status: "Present" }]);

    expect(notificationsService.addNotification).not.toHaveBeenCalled();
  });

  it("notifies user and module leads when consecutive absence threshold is reached", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 3,
      teamId: 1,
      team: {
        projectId: 10,
        teamName: "Team A",
        allocations: [{ user: { id: 1, firstName: "Alice", lastName: "Smith" } }],
      },
    });
    (repo.getModuleMeetingSettingsForTeam as any).mockResolvedValue({ absenceThreshold: 2, minutesEditWindowDays: 7 });
    (repo.getModuleLeadsForTeam as any).mockResolvedValue([{ userId: 99 }]);
    (repo.getRecentAttendanceForUser as any).mockResolvedValue([{ status: "absent" }, { status: "absent" }]);

    await markAttendance(3, [{ userId: 1, status: "absent" }]);

    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, type: "LOW_ATTENDANCE" })
    );
    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 99, type: "LOW_ATTENDANCE" })
    );
  });

  it("throws NOT_FOUND from saveMinutes when meeting does not exist", async () => {
    (repo.getMeetingById as any).mockResolvedValue(null);

    await expect(saveMinutes(5, 1, "notes")).rejects.toEqual({ code: "NOT_FOUND" });
  });

  it("throws FORBIDDEN from saveMinutes when writer is not the original writer and toggle is off", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 5, teamId: 1, minutes: { writerId: 2, content: "original" }, team: { allocations: [{ userId: 1 }] },
    });
    (repo.getModuleMeetingSettingsForTeam as any).mockResolvedValue({ allowAnyoneToWriteMinutes: false });

    await expect(saveMinutes(5, 1, "overwrite")).rejects.toEqual({ code: "FORBIDDEN" });
  });

  it("allows team member to edit minutes when toggle is on", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 5, teamId: 1, minutes: { writerId: 2, content: "original" }, team: { allocations: [{ userId: 1 }] },
    });
    (repo.getModuleMeetingSettingsForTeam as any).mockResolvedValue({ allowAnyoneToWriteMinutes: true });
    (repo.upsertMinutes as any).mockResolvedValue({ id: 1, content: "updated" });

    await saveMinutes(5, 1, "updated");

    expect(repo.upsertMinutes).toHaveBeenCalledWith(5, 1, "updated");
  });

  it("throws FORBIDDEN from saveMinutes when toggle is on but user is not a team member", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 5, teamId: 1, minutes: { writerId: 2, content: "original" }, team: { allocations: [] },
    });
    (repo.getModuleMeetingSettingsForTeam as any).mockResolvedValue({ allowAnyoneToWriteMinutes: true });

    await expect(saveMinutes(5, 1, "overwrite")).rejects.toEqual({ code: "FORBIDDEN" });
  });

  it("forwards saveMinutes to repo", async () => {
    (repo.getMeetingById as any).mockResolvedValue({ id: 5, minutes: null, organiserId: 1 });
    (repo.upsertMinutes as any).mockResolvedValue({ id: 1, content: "notes" });

    await saveMinutes(5, 1, "notes");

    expect(repo.upsertMinutes).toHaveBeenCalledWith(5, 1, "notes");
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

  it("forwards removeComment to repo", async () => {
    await removeComment(12);

    expect(repo.deleteComment).toHaveBeenCalledWith(12);
  });

  it("returns null from fetchMeetingSettings when meeting not found", async () => {
    (repo.getMeetingById as any).mockResolvedValue(null);

    const result = await fetchMeetingSettings(99);

    expect(result).toBeNull();
  });

  it("returns module settings for the meeting's team", async () => {
    (repo.getMeetingById as any).mockResolvedValue({ id: 1, teamId: 5 });
    (repo.getModuleMeetingSettingsForTeam as any).mockResolvedValue({ absenceThreshold: 3, minutesEditWindowDays: 7 });

    const result = await fetchMeetingSettings(1);

    expect(repo.getModuleMeetingSettingsForTeam).toHaveBeenCalledWith(5);
    expect(result).toEqual({ absenceThreshold: 3, minutesEditWindowDays: 7 });
  });

  describe("parseMentions", () => {
    it("returns empty array when content has no mentions", () => {
      expect(parseMentions("no mentions here")).toEqual([]);
    });

    it("extracts a single mention", () => {
      expect(parseMentions("hello @Alice Smith")).toEqual(["Alice Smith"]);
    });

    it("extracts multiple mentions", () => {
      expect(parseMentions("cc @Alice Smith and @Bob Jones")).toEqual(["Alice Smith", "Bob Jones"]);
    });
  });
});
