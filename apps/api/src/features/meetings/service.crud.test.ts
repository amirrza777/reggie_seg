import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listMeetings,
  fetchMeeting,
  addMeeting,
  editMeeting,
  removeMeeting,
} from "./service.js";

import * as repo from "./repo.js";
import * as teamAllocationService from "../teamAllocation/service/service.js";
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
  getModuleMeetingSettingsForTeam: vi.fn(),
}));

vi.mock("../teamAllocation/service/service.js", () => ({
  getTeamMembers: vi.fn(),
}));

vi.mock("../../shared/email.js", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("../notifications/service.js", () => ({
  addNotification: vi.fn(),
}));

vi.mock("../../shared/projectWriteGuard.js", () => ({
  assertProjectMutableForWritesByTeamId: vi.fn().mockResolvedValue(undefined),
  assertProjectMutableForWritesByProjectId: vi.fn().mockResolvedValue(undefined),
}));

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

function setupAddMeetingMocks(
  members: { id: number; email: string }[],
  meetingId: number,
  teamState?: Record<string, unknown>,
) {
  (repo.getTeamMeetingState as any).mockResolvedValue({ archivedAt: null, inactivityFlag: "NONE", projectId: 10, ...teamState });
  (repo.createMeeting as any).mockResolvedValue({ id: meetingId });
  (teamAllocationService.getTeamMembers as any).mockResolvedValue(members);
  (repo.createParticipants as any).mockResolvedValue(undefined);
  (email.sendEmail as any).mockResolvedValue(undefined);
}

describe("meetings crud service", () => {
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
    const members = [{ id: 1, email: "a@test.com" }, { id: 2, email: "b@test.com" }];
    setupAddMeetingMocks(members, 3);

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
    const members = [{ id: 1, email: "a@test.com" }, { id: 2, email: "b@test.com" }, { id: 3, email: "c@test.com" }];
    setupAddMeetingMocks(members, 5);

    await addMeeting({ teamId: 1, organiserId: 1, title: "Team Meeting", date: new Date("2026-03-01"), participantIds: [1, 3] });

    expect(repo.createParticipants).toHaveBeenCalledWith(5, [1, 3]);
  });

  it("sends invite email with ics attachment to each participant", async () => {
    setupAddMeetingMocks([{ id: 1, email: "a@test.com" }], 1);

    await addMeeting({ teamId: 1, organiserId: 1, title: "Design Review", date: new Date("2026-05-01T14:00:00Z") });

    expect(email.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "a@test.com",
        attachments: expect.arrayContaining([
          expect.objectContaining({ filename: "meeting.ics" }),
        ]),
      })
    );
  });

  it("escapes special characters in ics text fields", async () => {
    setupAddMeetingMocks([{ id: 1, email: "a@test.com" }], 1);

    await addMeeting({
      teamId: 1,
      organiserId: 1,
      title: "Review; Planning, Notes",
      date: new Date("2026-05-01T14:00:00Z"),
      location: "Room 2.01; Floor 2",
    });

    const call = (email.sendEmail as any).mock.calls[0][0];
    const icsContent = call.attachments[0].content;
    expect(icsContent).toContain("SUMMARY:Review\\; Planning\\, Notes");
    expect(icsContent).toContain("LOCATION:Room 2.01\\; Floor 2");
  });

  it("sends invite email only to selected participants when participantIds provided", async () => {
    setupAddMeetingMocks([{ id: 1, email: "a@test.com" }, { id: 2, email: "b@test.com" }], 2);

    await addMeeting({ teamId: 1, organiserId: 1, title: "Team Meeting", date: new Date("2026-05-01"), participantIds: [1] });

    expect(email.sendEmail).toHaveBeenCalledTimes(1);
    expect(email.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "a@test.com" }));
  });

  it("clears inactivity flag when team has YELLOW flag", async () => {
    setupAddMeetingMocks([{ id: 1, email: "a@test.com" }], 1, { inactivityFlag: "YELLOW" });

    await addMeeting({ teamId: 1, organiserId: 1, title: "Team Meeting", date: new Date("2026-05-01") });

    expect(repo.clearTeamInactivityFlag).toHaveBeenCalledWith(1);
  });

  it("sends MEETING_CREATED notification to participants except the organiser", async () => {
    setupAddMeetingMocks([{ id: 1, email: "a@test.com" }, { id: 2, email: "b@test.com" }, { id: 3, email: "c@test.com" }], 5);

    await addMeeting({ teamId: 1, organiserId: 1, title: "Design Review", date: new Date("2026-05-01") });

    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 2, type: "MEETING_CREATED" })
    );
    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 3, type: "MEETING_CREATED" })
    );
    expect(notificationsService.addNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, type: "MEETING_CREATED" })
    );
  });

  it("rejects addMeeting when project itself is archived", async () => {
    (repo.getTeamMeetingState as any).mockResolvedValue({
      archivedAt: null,
      inactivityFlag: "NONE",
      deadlineProfile: "STANDARD",
      deadlineOverride: null,
      project: {
        archivedAt: new Date("2020-01-01"),
        module: { archivedAt: null },
        deadline: null,
      },
    });

    await expect(
      addMeeting({ teamId: 1, organiserId: 1, title: "Meeting", date: new Date("2026-03-01") })
    ).rejects.toEqual({ code: "PROJECT_COMPLETED" });
    expect(repo.createMeeting).not.toHaveBeenCalled();
  });

  it("rejects addMeeting when team deadline override date has passed", async () => {
    (repo.getTeamMeetingState as any).mockResolvedValue({
      archivedAt: null,
      inactivityFlag: "NONE",
      deadlineProfile: "STANDARD",
      deadlineOverride: { feedbackDueDate: new Date("2020-06-01") },
      project: {
        archivedAt: null,
        module: { archivedAt: null },
        deadline: { feedbackDueDate: new Date("2030-01-01"), feedbackDueDateMcf: null },
      },
    });

    await expect(
      addMeeting({ teamId: 1, organiserId: 1, title: "Override Meeting", date: new Date("2026-03-01") })
    ).rejects.toEqual({ code: "PROJECT_COMPLETED" });
    expect(repo.createMeeting).not.toHaveBeenCalled();
  });

  it("rejects addMeeting when MCF deadline profile has passed", async () => {
    (repo.getTeamMeetingState as any).mockResolvedValue({
      archivedAt: null,
      inactivityFlag: "NONE",
      deadlineProfile: "MCF",
      deadlineOverride: null,
      project: {
        archivedAt: null,
        deadline: {
          feedbackDueDate: new Date("2030-01-01"),
          feedbackDueDateMcf: new Date("2020-01-01"),
        },
      },
    });

    await expect(
      addMeeting({ teamId: 1, organiserId: 1, title: "Late Meeting", date: new Date("2026-03-01") })
    ).rejects.toEqual({ code: "PROJECT_COMPLETED" });
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
      id: 1, teamId: 1, organiserId: 2, date: tomorrow, participants: [], team: { projectId: 5, allocations: [{ userId: 1 }] },
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
      id: 1, organiserId: 1, date: tomorrow, title: "Team Meeting", participants: [], team: { projectId: 5, allocations: [] },
    });
    (repo.updateMeeting as any).mockResolvedValue({ id: 1, title: "Updated" });

    const result = await editMeeting(1, 1, { title: "Updated" });

    expect(repo.updateMeeting).toHaveBeenCalledWith(1, { title: "Updated" });
    expect(result).toEqual({ id: 1, title: "Updated" });
  });

  it("replaces participants when participantIds provided in editMeeting", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 1, organiserId: 1, date: tomorrow, title: "Team Meeting", participants: [], team: { projectId: 5, allocations: [] },
    });
    (repo.updateMeeting as any).mockResolvedValue({ id: 1, title: "Updated" });

    await editMeeting(1, 1, { title: "Updated", participantIds: [2, 3] });

    expect(repo.replaceParticipants).toHaveBeenCalledWith(1, [2, 3]);
  });

  it("does not replace participants when participantIds not provided in editMeeting", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 1, organiserId: 1, date: tomorrow, title: "Team Meeting", participants: [], team: { projectId: 5, allocations: [] },
    });
    (repo.updateMeeting as any).mockResolvedValue({ id: 1, title: "Updated" });

    await editMeeting(1, 1, { title: "Updated" });

    expect(repo.replaceParticipants).not.toHaveBeenCalled();
  });

  it("forwards removeMeeting to repo", async () => {
    (repo.getMeetingById as any).mockResolvedValue(null);

    await removeMeeting(7);

    expect(repo.deleteMeeting).toHaveBeenCalledWith(7);
  });

  it("sends MEETING_DELETED notification to all participants when meeting exists", async () => {
    (repo.getMeetingById as any).mockResolvedValue({
      id: 7,
      title: "Team Meeting",
      teamId: 1,
      team: { projectId: 10 },
      participants: [{ userId: 1 }, { userId: 2 }],
    });
    (repo.deleteMeeting as any).mockResolvedValue(undefined);

    await removeMeeting(7);

    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, type: "MEETING_DELETED" })
    );
    expect(notificationsService.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 2, type: "MEETING_DELETED" })
    );
    expect(repo.deleteMeeting).toHaveBeenCalledWith(7);
  });

  it("does not send MEETING_DELETED notification when meeting is not found", async () => {
    (repo.getMeetingById as any).mockResolvedValue(null);
    (repo.deleteMeeting as any).mockResolvedValue(undefined);

    await removeMeeting(99);

    expect(notificationsService.addNotification).not.toHaveBeenCalled();
    expect(repo.deleteMeeting).toHaveBeenCalledWith(99);
  });

  describe("editMeeting MEETING_UPDATED notifications", () => {
    const meetingWithParticipants = {
      id: 1,
      teamId: 1,
      organiserId: 1,
      date: tomorrow,
      title: "Project Review",
      participants: [{ userId: 2 }, { userId: 3 }],
      team: { projectId: 5, allocations: [{ userId: 1 }] },
    };

    beforeEach(() => {
      (repo.getMeetingById as any).mockResolvedValue(meetingWithParticipants);
      (repo.updateMeeting as any).mockResolvedValue({ id: 1, title: "Project Review" });
    });

    it("notifies all participants except the editor", async () => {
      await editMeeting(1, 1, { title: "Updated" });

      expect(notificationsService.addNotification).toHaveBeenCalledTimes(2);
      expect(notificationsService.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 2, type: "MEETING_UPDATED" })
      );
      expect(notificationsService.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 3, type: "MEETING_UPDATED" })
      );
    });

    it("does not notify the editor", async () => {
      await editMeeting(1, 1, { title: "Updated" });

      const notifiedIds = (notificationsService.addNotification as any).mock.calls.map((c: any) => c[0].userId);
      expect(notifiedIds).not.toContain(1);
    });

    it("uses the new title in the notification message", async () => {
      await editMeeting(1, 1, { title: "New Title" });

      expect(notificationsService.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ message: `The meeting "New Title" has been updated` })
      );
    });

    it("falls back to existing title when title is not changed", async () => {
      await editMeeting(1, 1, { location: "Room 1" });

      expect(notificationsService.addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ message: `The meeting "Project Review" has been updated` })
      );
    });

    it("sends no notifications when meeting has no participants", async () => {
      (repo.getMeetingById as any).mockResolvedValue({ ...meetingWithParticipants, participants: [] });

      await editMeeting(1, 1, { title: "Updated" });

      expect(notificationsService.addNotification).not.toHaveBeenCalled();
    });
  });
});