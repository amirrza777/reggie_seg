import { beforeEach, describe, expect, it } from "vitest";
import {
  apiFetchMock,
  clearStaffStudentDeadlineOverride,
  createTeamHealthMessage,
  dismissTeamFlag,
  getMyTeamHealthMessages,
  getMyTeamWarnings,
  getStaffProjects,
  getStaffProjectsForMarking,
  getStaffStudentDeadlineOverrides,
  getStaffTeamDeadline,
  getStaffTeamHealthMessages,
  getStaffTeamWarnings,
  resolveStaffTeamHealthMessageWithDeadlineOverride,
  resolveStaffTeamWarning,
  reviewStaffTeamHealthMessage,
  updateStaffTeamDeadlineProfile,
  upsertStaffStudentDeadlineOverride,
} from "./client.test.shared";

describe("projects api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({});
  });

  it("creates a team health message", async () => {
    const request = { id: 1, resolved: false };
    apiFetchMock.mockResolvedValue({ request });

    const result = await createTeamHealthMessage(42, 7, "Need help", "Something happened");

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/team-health-messages", {
      method: "POST",
      body: JSON.stringify({ userId: 7, subject: "Need help", details: "Something happened" }),
    });
    expect(result).toEqual(request);
  });

  it("gets current user's team health messages", async () => {
    apiFetchMock.mockResolvedValue({ requests: [{ id: 1 }, { id: 2 }] });

    const result = await getMyTeamHealthMessages(42, 7);

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/team-health-messages/me?userId=7", {
      cache: "no-store",
    });
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("gets current user's team warnings", async () => {
    apiFetchMock.mockResolvedValue({ warnings: [{ id: 4 }, { id: 5 }] });

    const result = await getMyTeamWarnings(42, 7);

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/team-warnings/me?userId=7", {
      cache: "no-store",
    });
    expect(result).toEqual([{ id: 4 }, { id: 5 }]);
  });

  it("gets team health messages for staff view", async () => {
    apiFetchMock.mockResolvedValue({ requests: [{ id: 3 }] });

    const result = await getStaffTeamHealthMessages(9, 42, 5);

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/teams/5/team-health-messages?userId=9", {
      cache: "no-store",
    });
    expect(result).toEqual([{ id: 3 }]);
  });

  it("gets team warnings for staff view", async () => {
    apiFetchMock.mockResolvedValue({ warnings: [{ id: 8 }] });

    const result = await getStaffTeamWarnings(9, 42, 5);

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/teams/5/warnings?userId=9", {
      cache: "no-store",
    });
    expect(result).toEqual([{ id: 8 }]);
  });

  it("resolves a team warning for staff view", async () => {
    const warning = { id: 8, active: false };
    apiFetchMock.mockResolvedValue({ warning });

    const result = await resolveStaffTeamWarning(9, 42, 5, 8);

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/teams/5/warnings/8/resolve", {
      method: "PATCH",
      body: JSON.stringify({ userId: 9 }),
    });
    expect(result).toEqual(warning);
  });

  it("gets team deadline for staff view", async () => {
    const deadline = {
      baseDeadline: {
        taskOpenDate: "2026-03-10T08:00:00.000Z",
        taskDueDate: "2026-03-12T17:00:00.000Z",
        assessmentOpenDate: null,
        assessmentDueDate: null,
        feedbackOpenDate: null,
        feedbackDueDate: null,
        isOverridden: false,
      },
      effectiveDeadline: {
        taskOpenDate: "2026-03-12T08:00:00.000Z",
        taskDueDate: "2026-03-14T17:00:00.000Z",
        assessmentOpenDate: null,
        assessmentDueDate: null,
        feedbackOpenDate: null,
        feedbackDueDate: null,
        isOverridden: true,
      },
      deadlineInputMode: "SHIFT_DAYS",
      shiftDays: {
        taskOpenDate: 2,
        taskDueDate: 2,
      },
    };
    apiFetchMock.mockResolvedValue({ deadline });

    const result = await getStaffTeamDeadline(9, 42, 5);

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/teams/5/deadline?userId=9", {
      cache: "no-store",
    });
    expect(result).toEqual(deadline);
  });

  it("reviews a team health message for staff", async () => {
    const request = { id: 3, resolved: false };
    apiFetchMock.mockResolvedValue({ request });

    const result = await reviewStaffTeamHealthMessage(42, 5, 3, 9, false);

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/teams/5/team-health-messages/3/review", {
      method: "PATCH",
      body: JSON.stringify({ userId: 9, resolved: false }),
    });
    expect(result).toEqual(request);
  });

  it("reviews and resolves with a staff response", async () => {
    const request = { id: 3, resolved: true, responseText: "Thanks, we will monitor this closely." };
    apiFetchMock.mockResolvedValue({ request });

    const result = await reviewStaffTeamHealthMessage(
      42,
      5,
      3,
      9,
      true,
      "Thanks, we will monitor this closely.",
    );

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/teams/5/team-health-messages/3/review", {
      method: "PATCH",
      body: JSON.stringify({
        userId: 9,
        resolved: true,
        responseText: "Thanks, we will monitor this closely.",
      }),
    });
    expect(result).toEqual(request);
  });

  it("resolves a team health message with deadline override", async () => {
    const response = {
      request: { id: 3, resolved: true },
      deadline: { taskDueDate: "2026-03-15T12:00:00.000Z", isOverridden: true },
    };
    apiFetchMock.mockResolvedValue(response);

    const result = await resolveStaffTeamHealthMessageWithDeadlineOverride(42, 5, 3, 9, {
      taskDueDate: "2026-03-15T12:00:00.000Z",
      feedbackDueDate: null,
      deadlineInputMode: "SHIFT_DAYS",
      shiftDays: { taskDueDate: 3 },
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/teams/5/team-health-messages/3/deadline-override", {
      method: "POST",
      body: JSON.stringify({
        userId: 9,
        taskDueDate: "2026-03-15T12:00:00.000Z",
        feedbackDueDate: null,
        deadlineInputMode: "SHIFT_DAYS",
        shiftDays: { taskDueDate: 3 },
      }),
    });
    expect(result).toEqual(response);
  });

  it("gets staff projects for marking with and without query", async () => {
    await getStaffProjectsForMarking(9);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/marking?userId=9");

    await getStaffProjectsForMarking(9, { query: "  seg  " });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/marking?userId=9&q=seg");
  });

  it("gets staff projects with optional query and module filters", async () => {
    await getStaffProjects(9);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/mine?userId=9");

    await getStaffProjects(9, { query: "  repo  " });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/mine?userId=9&q=repo");

    await getStaffProjects(9, { moduleId: 12 });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/mine?userId=9&moduleId=12");

    await getStaffProjects(9, { query: "x", moduleId: 12 });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/mine?userId=9&q=x&moduleId=12");
  });

  it("dismisses warning flags and updates team deadline profile", async () => {
    await dismissTeamFlag(55);
    expect(apiFetchMock).toHaveBeenCalledWith("/teams/55/dismiss-flag", { method: "PATCH" });

    await updateStaffTeamDeadlineProfile(44, "MCF");
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/teams/44/deadline-profile", {
      method: "PATCH",
      body: JSON.stringify({ deadlineProfile: "MCF" }),
    });
  });

  it("gets, upserts, and clears student deadline overrides", async () => {
    apiFetchMock.mockResolvedValueOnce({ overrides: [{ id: 1 }] });
    const overrides = await getStaffStudentDeadlineOverrides(77);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/77/students/deadline-overrides", {
      cache: "no-store",
    });
    expect(overrides).toEqual([{ id: 1 }]);

    apiFetchMock.mockResolvedValueOnce({ override: { id: 2 } });
    const updated = await upsertStaffStudentDeadlineOverride(77, 9, {
      taskDueDate: "2026-03-15T12:00:00.000Z",
      feedbackDueDate: null,
      deadlineInputMode: "ABSOLUTE",
      shiftDays: null,
    });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/77/students/9/deadline-override", {
      method: "PUT",
      body: JSON.stringify({
        taskDueDate: "2026-03-15T12:00:00.000Z",
        feedbackDueDate: null,
        deadlineInputMode: "ABSOLUTE",
        shiftDays: null,
      }),
    });
    expect(updated).toEqual({ id: 2 });

    await clearStaffStudentDeadlineOverride(77, 9);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/77/students/9/deadline-override", {
      method: "DELETE",
    });
  });
});
