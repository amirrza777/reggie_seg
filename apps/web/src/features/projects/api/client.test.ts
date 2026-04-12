import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import {
  createTeamHealthMessage,
  getStaffTeamDeadline,
  getMyTeamHealthMessages,
  getStaffTeamWarnings,
  resolveStaffTeamWarning,
  getMyTeamWarnings,
  resolveStaffTeamHealthMessageWithDeadlineOverride,
  reviewStaffTeamHealthMessage,
  getStaffTeamHealthMessages,
  createStaffProject,
  getTeamAllocationQuestionnaireForProject,
  submitTeamAllocationQuestionnaireResponse,
  getProject,
  getProjectDeadline,
  getProjectMarking,
  getStaffProjectNavFlagsConfig,
  getStaffProjectTeams,
  getStaffProjectManage,
  getStaffProjectPeerAssessmentOverview,
  patchStaffProjectManage,
  deleteStaffProjectManage,
  getStaffProjectWarningsConfig,
  getTeamById,
  getTeamByUserAndProject,
  getTeammatesInProject,
  getUserProjects,
  updateStaffProjectWarningsConfig,
  updateStaffProjectNavFlagsConfig,
} from "./client";

describe("projects api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({});
  });

  it("gets one project", async () => {
    await getProject("42");
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42");
  });

  it("gets team allocation questionnaire for a project without cache", async () => {
    await getTeamAllocationQuestionnaireForProject(42);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/team-allocation-questionnaire", {
      cache: "no-store",
    });
  });

  it("submits team allocation questionnaire response and unwraps payload", async () => {
    apiFetchMock.mockResolvedValue({
      response: {
        id: 88,
        updatedAt: "2026-03-30T22:00:00.000Z",
      },
    });

    const result = await submitTeamAllocationQuestionnaireResponse(42, { 1: "A", 2: 5 });

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/team-allocation-questionnaire/response", {
      method: "POST",
      body: JSON.stringify({ answersJson: { 1: "A", 2: 5 } }),
    });
    expect(result).toEqual({
      id: 88,
      updatedAt: "2026-03-30T22:00:00.000Z",
    });
  });

  it("gets user projects", async () => {
    await getUserProjects(7);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects?userId=7");
  });

  it("unwraps deadline response", async () => {
    const deadline = {
      taskOpenDate: null,
      taskDueDate: null,
      assessmentOpenDate: null,
      assessmentDueDate: null,
      feedbackOpenDate: null,
      feedbackDueDate: null,
      isOverridden: false,
    };
    apiFetchMock.mockResolvedValue({ deadline });

    const result = await getProjectDeadline(7, 42);

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/deadline?userId=7");
    expect(result).toEqual(deadline);
  });

  it("gets teammates in project", async () => {
    await getTeammatesInProject(7, 42);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/teammates?userId=7");
  });

  it("gets team by id", async () => {
    await getTeamById(8);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/teams/8");
  });

  it("gets team by user and project", async () => {
    await getTeamByUserAndProject(7, 42);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/team?userId=7", {
      cache: "no-store",
    });
  });

  it("gets staff project teams without cache", async () => {
    await getStaffProjectTeams(7, 42);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/teams?userId=7", {
      cache: "no-store",
    });
  });

  it("gets staff project manage summary without cache", async () => {
    await getStaffProjectManage(42);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/manage", {
      cache: "no-store",
    });
  });

  it("gets staff project peer assessment overview without cache", async () => {
    await getStaffProjectPeerAssessmentOverview(42);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/peer-assessments", {
      cache: "no-store",
    });
  });

  it("patches staff project manage settings", async () => {
    await patchStaffProjectManage(42, { name: "Renamed" });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/manage", {
      method: "PATCH",
      body: JSON.stringify({ name: "Renamed" }),
    });
  });

  it("deletes staff project via manage endpoint", async () => {
    await deleteStaffProjectManage(42);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/manage", {
      method: "DELETE",
    });
  });

  it("gets staff project warning config without cache", async () => {
    await getStaffProjectWarningsConfig(42);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/warnings-config", {
      cache: "no-store",
    });
  });

  it("updates staff project warning config", async () => {
    const warningsConfig = {
      version: 1 as const,
      rules: [
        {
          key: "LOW_ATTENDANCE",
          enabled: true,
          severity: "HIGH" as const,
          params: { minPercent: 30, lookbackDays: 30 },
        },
      ],
    };

    await updateStaffProjectWarningsConfig(42, warningsConfig);

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/warnings-config", {
      method: "PATCH",
      body: JSON.stringify({ warningsConfig }),
    });
  });

  it("gets staff project nav flags config without cache", async () => {
    await getStaffProjectNavFlagsConfig(42);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/project-feature-flags", {
      cache: "no-store",
    });
  });

  it("updates staff project nav flags config", async () => {
    const projectNavFlags = {
      version: 1 as const,
      active: {
        team: true,
        meetings: true,
        peer_assessment: true,
        peer_feedback: false,
        repos: true,
        trello: true,
        discussion: true,
        team_health: true,
      },
      completed: {
        team: true,
        meetings: true,
        peer_assessment: true,
        peer_feedback: true,
        repos: true,
        trello: false,
        discussion: true,
        team_health: true,
      },
    };

    await updateStaffProjectNavFlagsConfig(42, projectNavFlags);

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/staff/42/project-feature-flags", {
      method: "PATCH",
      body: JSON.stringify({ projectNavFlags }),
    });
  });

  it("gets project marking for the current user", async () => {
    await getProjectMarking(7, 42);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/marking?userId=7", {
      cache: "no-store",
    });
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
      "Thanks, we will monitor this closely."
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

  it("creates a staff project", async () => {
    const deadline = {
      taskOpenDate: "2026-03-01T09:00:00.000Z",
      taskDueDate: "2026-03-08T17:00:00.000Z",
      assessmentOpenDate: "2026-03-09T09:00:00.000Z",
      assessmentDueDate: "2026-03-12T17:00:00.000Z",
      feedbackOpenDate: "2026-03-13T09:00:00.000Z",
      feedbackDueDate: "2026-03-16T17:00:00.000Z",
    };

    await createStaffProject({
      name: "Project A",
      moduleId: 2,
      questionnaireTemplateId: 9,
      informationText: "Project guidance for students.",
      deadline,
    });
    expect(apiFetchMock).toHaveBeenCalledWith("/projects", {
      method: "POST",
      body: JSON.stringify({
        name: "Project A",
        moduleId: 2,
        questionnaireTemplateId: 9,
        informationText: "Project guidance for students.",
        deadline,
      }),
    });
  });
});
