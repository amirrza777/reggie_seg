import { beforeEach, describe, expect, it } from "vitest";
import {
  apiFetchMock,
  createStaffProject,
  deleteStaffProjectManage,
  getProject,
  getProjectDeadline,
  getProjectMarking,
  getStaffProjectManage,
  getStaffProjectNavFlagsConfig,
  getStaffProjectPeerAssessmentOverview,
  getStaffProjectTeams,
  getStaffProjectWarningsConfig,
  getTeamAllocationQuestionnaireForProject,
  getTeamAllocationQuestionnaireStatusForProject,
  getTeamById,
  getTeamByUserAndProject,
  getTeammatesInProject,
  getUserProjects,
  patchStaffProjectManage,
  submitTeamAllocationQuestionnaireResponse,
  updateStaffProjectNavFlagsConfig,
  updateStaffProjectWarningsConfig,
} from "./client.test.shared";

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

  it("gets team allocation questionnaire status for a project", async () => {
    await getTeamAllocationQuestionnaireStatusForProject(42);
    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/team-allocation-questionnaire-status", {
      cache: "no-store",
    });
  });
});
