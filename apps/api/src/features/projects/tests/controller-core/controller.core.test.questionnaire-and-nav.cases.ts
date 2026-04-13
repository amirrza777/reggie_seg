/* eslint-disable max-lines-per-function, max-statements, @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockResponse } from "./controller.core.shared-test-helpers.js";
import * as service from "../../service.js";
import {
  getProjectNavFlagsConfigHandler,
  getTeamAllocationQuestionnaireForProjectHandler,
  getTeamAllocationQuestionnaireStatusForProjectHandler,
  submitTeamAllocationQuestionnaireResponseHandler,
  updateProjectNavFlagsConfigHandler,
} from "../../controller.js";
import { AssessmentAnswerValidationError } from "../../../peerAssessment/answers.js";

describe("project questionnaire and nav handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getTeamAllocationQuestionnaireForProjectHandler validates id and maps missing template", async () => {
    const badRes = mockResponse();
    await getTeamAllocationQuestionnaireForProjectHandler({ params: { projectId: "x" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchTeamAllocationQuestionnaireForProject as any).mockResolvedValue({
      teamAllocationQuestionnaireTemplate: null,
    });
    const missingRes = mockResponse();
    await getTeamAllocationQuestionnaireForProjectHandler({ params: { projectId: "10" } } as any, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);

    (service.fetchTeamAllocationQuestionnaireForProject as any).mockResolvedValue({
      teamAllocationQuestionnaireTemplate: { id: 8, templateName: "Allocation", questions: [] },
    });
    const okRes = mockResponse();
    await getTeamAllocationQuestionnaireForProjectHandler({ params: { projectId: "10" } } as any, okRes);
    expect(okRes.json).toHaveBeenCalledWith({ id: 8, templateName: "Allocation", questions: [] });
  });

  it("submitTeamAllocationQuestionnaireResponseHandler validates payload and saves responses", async () => {
    const unauthorizedRes = mockResponse();
    await submitTeamAllocationQuestionnaireResponseHandler(
      { params: { projectId: "10" }, body: { answersJson: { "1": "A" } } } as any,
      unauthorizedRes,
    );
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badIdRes = mockResponse();
    await submitTeamAllocationQuestionnaireResponseHandler(
      { user: { sub: 2 }, params: { projectId: "x" }, body: { answersJson: { "1": "A" } } } as any,
      badIdRes,
    );
    expect(badIdRes.status).toHaveBeenCalledWith(400);

    const badBodyRes = mockResponse();
    await submitTeamAllocationQuestionnaireResponseHandler(
      { user: { sub: 2 }, params: { projectId: "10" }, body: {} } as any,
      badBodyRes,
    );
    expect(badBodyRes.status).toHaveBeenCalledWith(400);

    (service.submitTeamAllocationQuestionnaireResponse as any).mockResolvedValue({
      id: 55,
      updatedAt: "2026-03-30T22:00:00.000Z",
    });
    const okRes = mockResponse();
    await submitTeamAllocationQuestionnaireResponseHandler(
      { user: { sub: 2 }, params: { projectId: "10" }, body: { answersJson: { "1": "A" } } } as any,
      okRes,
    );
    expect(service.submitTeamAllocationQuestionnaireResponse).toHaveBeenCalledWith(2, 10, { "1": "A" });
    expect(okRes.status).toHaveBeenCalledWith(201);
    expect(okRes.json).toHaveBeenCalledWith({
      response: { id: 55, updatedAt: "2026-03-30T22:00:00.000Z" },
    });
  });

  it("getTeamAllocationQuestionnaireStatusForProjectHandler covers missing and failure branches", async () => {
    (service.fetchTeamAllocationQuestionnaireForProject as any).mockRejectedValueOnce(new Error("allocation-template-fail"));
    const questionnaireErrorRes = mockResponse();
    await getTeamAllocationQuestionnaireForProjectHandler({ params: { projectId: "2" } } as any, questionnaireErrorRes);
    expect(questionnaireErrorRes.status).toHaveBeenCalledWith(500);

    const statusUnauthorizedRes = mockResponse();
    await getTeamAllocationQuestionnaireStatusForProjectHandler({ params: { projectId: "2" } } as any, statusUnauthorizedRes);
    expect(statusUnauthorizedRes.status).toHaveBeenCalledWith(401);

    const statusBadIdRes = mockResponse();
    await getTeamAllocationQuestionnaireStatusForProjectHandler(
      { user: { sub: 4 }, params: { projectId: "x" } } as any,
      statusBadIdRes,
    );
    expect(statusBadIdRes.status).toHaveBeenCalledWith(400);

    (service.fetchTeamAllocationQuestionnaireStatusForUser as any).mockResolvedValueOnce(null);
    const statusMissingRes = mockResponse();
    await getTeamAllocationQuestionnaireStatusForProjectHandler(
      { user: { sub: 4 }, params: { projectId: "2" } } as any,
      statusMissingRes,
    );
    expect(statusMissingRes.status).toHaveBeenCalledWith(404);

    (service.fetchTeamAllocationQuestionnaireStatusForUser as any).mockResolvedValueOnce({ isOpen: true });
    const statusOkRes = mockResponse();
    await getTeamAllocationQuestionnaireStatusForProjectHandler(
      { user: { sub: 4 }, params: { projectId: "2" } } as any,
      statusOkRes,
    );
    expect(statusOkRes.json).toHaveBeenCalledWith({ isOpen: true });

    (service.fetchTeamAllocationQuestionnaireStatusForUser as any).mockRejectedValueOnce(new Error("status-fail"));
    const statusErrorRes = mockResponse();
    await getTeamAllocationQuestionnaireStatusForProjectHandler(
      { user: { sub: 4 }, params: { projectId: "2" } } as any,
      statusErrorRes,
    );
    expect(statusErrorRes.status).toHaveBeenCalledWith(500);
  });

  it("submitTeamAllocationQuestionnaireResponseHandler maps domain and validation errors", async () => {
    const req: any = { user: { sub: 4 }, params: { projectId: "2" }, body: { answersJson: { "1": "A" } } };

    const cases = [
      {
        error: { code: "PROJECT_OR_TEMPLATE_NOT_FOUND_OR_FORBIDDEN" },
        status: 404,
        message: "Team allocation questionnaire template not found for this project",
      },
      {
        error: { code: "TEMPLATE_INVALID_PURPOSE" },
        status: 400,
        message: "Questionnaire template must have CUSTOMISED_ALLOCATION purpose",
      },
      {
        error: { code: "TEMPLATE_CONTAINS_UNSUPPORTED_QUESTION_TYPES" },
        status: 400,
        message: "Custom allocation questionnaires can only include multiple-choice, rating, or slider questions",
      },
      {
        error: { code: "QUESTIONNAIRE_WINDOW_NOT_OPEN" },
        status: 409,
        message: "The team allocation questionnaire is not open yet",
      },
      {
        error: { code: "QUESTIONNAIRE_WINDOW_CLOSED" },
        status: 409,
        message: "The team allocation questionnaire deadline has passed",
      },
      {
        error: { code: "USER_ALREADY_IN_TEAM" },
        status: 409,
        message: "You are already assigned to a team in this project",
      },
    ] as const;

    for (const entry of cases) {
      (service.submitTeamAllocationQuestionnaireResponse as any).mockRejectedValueOnce(entry.error);
      const res = mockResponse();
      await submitTeamAllocationQuestionnaireResponseHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(entry.status);
      expect(res.json).toHaveBeenCalledWith({ error: entry.message });
    }

    (service.submitTeamAllocationQuestionnaireResponse as any).mockRejectedValueOnce(
      new AssessmentAnswerValidationError("invalid answers payload"),
    );
    const validationRes = mockResponse();
    await submitTeamAllocationQuestionnaireResponseHandler(req, validationRes);
    expect(validationRes.status).toHaveBeenCalledWith(400);
    expect(validationRes.json).toHaveBeenCalledWith({ error: "invalid answers payload" });

    (service.submitTeamAllocationQuestionnaireResponse as any).mockRejectedValueOnce(new Error("submit-fail"));
    const genericRes = mockResponse();
    await submitTeamAllocationQuestionnaireResponseHandler(req, genericRes);
    expect(genericRes.status).toHaveBeenCalledWith(500);
  });

  it("getProjectNavFlagsConfigHandler validates id and returns config", async () => {
    const unauthorizedRes = mockResponse();
    await getProjectNavFlagsConfigHandler({ params: { projectId: "3" } } as any, unauthorizedRes);
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badRes = mockResponse();
    await getProjectNavFlagsConfigHandler({ user: { sub: 7 }, params: { projectId: "x" } } as any, badRes);
    expect(badRes.status).toHaveBeenCalledWith(400);

    (service.fetchProjectNavFlagsConfigForStaff as any).mockResolvedValueOnce({
      id: 3,
      name: "Project A",
      hasPersistedProjectNavFlags: true,
      projectNavFlags: { version: 1, active: {}, completed: {} },
    });
    const okRes = mockResponse();
    await getProjectNavFlagsConfigHandler({ user: { sub: 7 }, params: { projectId: "3" } } as any, okRes);
    expect(service.fetchProjectNavFlagsConfigForStaff).toHaveBeenCalledWith(7, 3);
    expect(okRes.json).toHaveBeenCalledWith({
      id: 3,
      name: "Project A",
      hasPersistedProjectNavFlags: true,
      projectNavFlags: { version: 1, active: {}, completed: {} },
    });

    (service.fetchProjectNavFlagsConfigForStaff as any).mockResolvedValueOnce(null);
    const missingRes = mockResponse();
    await getProjectNavFlagsConfigHandler({ user: { sub: 7 }, params: { projectId: "3" } } as any, missingRes);
    expect(missingRes.status).toHaveBeenCalledWith(404);
  });

  it("updateProjectNavFlagsConfigHandler validates payload and updates config", async () => {
    const unauthorizedRes = mockResponse();
    await updateProjectNavFlagsConfigHandler(
      { params: { projectId: "3" }, body: { projectNavFlags: { version: 1, active: {}, completed: {} } } } as any,
      unauthorizedRes,
    );
    expect(unauthorizedRes.status).toHaveBeenCalledWith(401);

    const badIdRes = mockResponse();
    await updateProjectNavFlagsConfigHandler(
      {
        user: { sub: 7 },
        params: { projectId: "x" },
        body: { projectNavFlags: { version: 1, active: {}, completed: {} } },
      } as any,
      badIdRes,
    );
    expect(badIdRes.status).toHaveBeenCalledWith(400);

    const missingBodyRes = mockResponse();
    await updateProjectNavFlagsConfigHandler(
      { user: { sub: 7 }, params: { projectId: "3" }, body: {} } as any,
      missingBodyRes,
    );
    expect(missingBodyRes.status).toHaveBeenCalledWith(400);

    (service.updateProjectNavFlagsConfigForStaff as any).mockResolvedValueOnce({
      id: 3,
      name: "Project A",
      hasPersistedProjectNavFlags: true,
      projectNavFlags: { version: 1, active: {}, completed: {} },
    });
    const okRes = mockResponse();
    await updateProjectNavFlagsConfigHandler(
      {
        user: { sub: 7 },
        params: { projectId: "3" },
        body: { projectNavFlags: { version: 1, active: {}, completed: {} } },
      } as any,
      okRes,
    );
    expect(service.updateProjectNavFlagsConfigForStaff).toHaveBeenCalledWith(
      7,
      3,
      { version: 1, active: {}, completed: {} },
    );
    expect(okRes.json).toHaveBeenCalledWith({
      id: 3,
      name: "Project A",
      hasPersistedProjectNavFlags: true,
      projectNavFlags: { version: 1, active: {}, completed: {} },
    });

    (service.updateProjectNavFlagsConfigForStaff as any).mockRejectedValueOnce({ code: "INVALID_PROJECT_NAV_FLAGS_CONFIG" });
    const invalidRes = mockResponse();
    await updateProjectNavFlagsConfigHandler(
      { user: { sub: 7 }, params: { projectId: "3" }, body: { projectNavFlags: { bad: true } } } as any,
      invalidRes,
    );
    expect(invalidRes.status).toHaveBeenCalledWith(400);
  });
});
