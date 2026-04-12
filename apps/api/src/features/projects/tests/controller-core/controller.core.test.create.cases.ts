/* eslint-disable max-lines-per-function, @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deadlinePayload, mockResponse } from "./controller.core.shared-test-helpers.js";
import * as service from "../../service.js";
import { createProjectHandler } from "../../controller.js";

describe("createProjectHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates payload", async () => {
    const res = mockResponse();
    await createProjectHandler({ user: { sub: 1 }, body: {} } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("requires authenticated user", async () => {
    const res = mockResponse();
    await createProjectHandler(
      { body: { name: "P1", moduleId: 2, questionnaireTemplateId: 3, deadline: deadlinePayload } } as any,
      res,
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("creates project and returns 201", async () => {
    (service.createProject as any).mockResolvedValue({ id: 1, name: "P1" });
    const req: any = {
      user: { sub: 42 },
      body: { name: "P1", moduleId: 2, questionnaireTemplateId: 3, deadline: deadlinePayload },
    };
    const res = mockResponse();

    await createProjectHandler(req, res);

    expect(service.createProject).toHaveBeenCalledWith(
      42,
      "P1",
      2,
      3,
      undefined,
      null,
      expect.objectContaining({
        taskOpenDate: expect.any(Date),
        taskDueDate: expect.any(Date),
        taskDueDateMcf: expect.any(Date),
        assessmentOpenDate: expect.any(Date),
        assessmentDueDate: expect.any(Date),
        assessmentDueDateMcf: expect.any(Date),
        feedbackOpenDate: expect.any(Date),
        feedbackDueDate: expect.any(Date),
        feedbackDueDateMcf: expect.any(Date),
      }),
      undefined,
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1, name: "P1" });
  });

  it("validates deadline payload", async () => {
    const resMissing = mockResponse();
    await createProjectHandler(
      { user: { sub: 1 }, body: { name: "P1", moduleId: 2, questionnaireTemplateId: 3 } } as any,
      resMissing,
    );
    expect(resMissing.status).toHaveBeenCalledWith(400);

    const resOrder = mockResponse();
    await createProjectHandler(
      {
        user: { sub: 1 },
        body: {
          name: "P1",
          moduleId: 2,
          questionnaireTemplateId: 3,
          deadline: {
            ...deadlinePayload,
            taskOpenDate: deadlinePayload.taskDueDate,
          },
        },
      } as any,
      resOrder,
    );
    expect(resOrder.status).toHaveBeenCalledWith(400);
  });

  it("normalizes optional information text and maps service errors", async () => {
    (service.createProject as any)
      .mockRejectedValueOnce({ code: "FORBIDDEN", message: "Forbidden" })
      .mockRejectedValueOnce({ code: "MODULE_NOT_FOUND" })
      .mockRejectedValueOnce({ code: "TEMPLATE_NOT_FOUND" })
      .mockRejectedValueOnce(new Error("boom"));

    const forbiddenRes = mockResponse();
    await createProjectHandler(
      {
        user: { sub: 1 },
        body: {
          name: "  P1  ",
          moduleId: 2,
          questionnaireTemplateId: 3,
          informationText: "  hello world  ",
          deadline: deadlinePayload,
        },
      } as any,
      forbiddenRes,
    );
    expect(service.createProject).toHaveBeenCalledWith(
      1,
      "P1",
      2,
      3,
      undefined,
      "hello world",
      expect.objectContaining({
        taskOpenDate: expect.any(Date),
        taskDueDate: expect.any(Date),
        taskDueDateMcf: expect.any(Date),
        assessmentOpenDate: expect.any(Date),
        assessmentDueDate: expect.any(Date),
        assessmentDueDateMcf: expect.any(Date),
        feedbackOpenDate: expect.any(Date),
        feedbackDueDate: expect.any(Date),
        feedbackDueDateMcf: expect.any(Date),
      }),
      undefined,
    );
    expect(forbiddenRes.status).toHaveBeenCalledWith(403);

    const missingModuleRes = mockResponse();
    await createProjectHandler(
      { user: { sub: 1 }, body: { name: "P1", moduleId: 2, questionnaireTemplateId: 3, deadline: deadlinePayload } } as any,
      missingModuleRes,
    );
    expect(missingModuleRes.status).toHaveBeenCalledWith(404);
    expect(missingModuleRes.json).toHaveBeenCalledWith({ error: "Module not found" });

    const missingTemplateRes = mockResponse();
    await createProjectHandler(
      { user: { sub: 1 }, body: { name: "P1", moduleId: 2, questionnaireTemplateId: 3, deadline: deadlinePayload } } as any,
      missingTemplateRes,
    );
    expect(missingTemplateRes.status).toHaveBeenCalledWith(404);
    expect(missingTemplateRes.json).toHaveBeenCalledWith({ error: "Questionnaire template not found" });

    const genericRes = mockResponse();
    await createProjectHandler(
      { user: { sub: 1 }, body: { name: "P1", moduleId: 2, questionnaireTemplateId: 3, deadline: deadlinePayload } } as any,
      genericRes,
    );
    expect(genericRes.status).toHaveBeenCalledWith(500);
  });

  it("validates optional create payload fields", async () => {
    const tooLongNameRes = mockResponse();
    await createProjectHandler(
      {
        user: { sub: 3 },
        body: { name: "x".repeat(161), moduleId: 2, questionnaireTemplateId: 3, deadline: deadlinePayload },
      } as any,
      tooLongNameRes,
    );
    expect(tooLongNameRes.status).toHaveBeenCalledWith(400);

    const invalidIdsRes = mockResponse();
    await createProjectHandler(
      { user: { sub: 3 }, body: { name: "P1", moduleId: "bad", questionnaireTemplateId: 3, deadline: deadlinePayload } } as any,
      invalidIdsRes,
    );
    expect(invalidIdsRes.status).toHaveBeenCalledWith(400);

    const invalidTeamTemplateRes = mockResponse();
    await createProjectHandler(
      {
        user: { sub: 3 },
        body: {
          name: "P1",
          moduleId: 2,
          questionnaireTemplateId: 3,
          teamAllocationQuestionnaireTemplateId: "bad",
          deadline: deadlinePayload,
        },
      } as any,
      invalidTeamTemplateRes,
    );
    expect(invalidTeamTemplateRes.status).toHaveBeenCalledWith(400);

    const invalidInformationTextRes = mockResponse();
    await createProjectHandler(
      {
        user: { sub: 3 },
        body: {
          name: "P1",
          moduleId: 2,
          questionnaireTemplateId: 3,
          informationText: 12,
          deadline: deadlinePayload,
        },
      } as any,
      invalidInformationTextRes,
    );
    expect(invalidInformationTextRes.status).toHaveBeenCalledWith(400);

    const invalidStudentIdsRes = mockResponse();
    await createProjectHandler(
      { user: { sub: 3 }, body: { name: "P1", moduleId: 2, questionnaireTemplateId: 3, studentIds: ["x"], deadline: deadlinePayload } } as any,
      invalidStudentIdsRes,
    );
    expect(invalidStudentIdsRes.status).toHaveBeenCalledWith(400);
  });

  it("accepts optional team-allocation template and student ids", async () => {
    (service.createProject as any).mockResolvedValueOnce({ id: 22, name: "P1" });

    const res = mockResponse();
    await createProjectHandler(
      {
        user: { sub: 8 },
        body: {
          name: "P1",
          moduleId: 2,
          questionnaireTemplateId: 3,
          teamAllocationQuestionnaireTemplateId: 4,
          informationText: "  Notes for students  ",
          studentIds: [5, 7],
          deadline: deadlinePayload,
        },
      } as any,
      res,
    );

    expect(service.createProject).toHaveBeenCalledWith(
      8,
      "P1",
      2,
      3,
      4,
      "Notes for students",
      expect.objectContaining({ taskOpenDate: expect.any(Date) }),
      [5, 7],
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("maps write-guard and template/student service errors", async () => {
    const req: any = {
      user: { sub: 8 },
      body: { name: "P1", moduleId: 2, questionnaireTemplateId: 3, deadline: deadlinePayload },
    };

    const cases = [
      { error: { code: "FORBIDDEN", message: 123 }, status: 403, message: "Forbidden" },
      { error: { code: "PROJECT_ARCHIVED" }, status: 409, message: "Project is archived" },
      {
        error: { code: "MODULE_ARCHIVED" },
        status: 409,
        message: "This module is archived; its projects and teams cannot be edited",
      },
      {
        error: { code: "TEMPLATE_INVALID_PURPOSE" },
        status: 400,
        message: "Questionnaire template must have PEER_ASSESSMENT purpose for project setup",
      },
      {
        error: { code: "TEAM_ALLOCATION_TEMPLATE_NOT_FOUND" },
        status: 404,
        message: "Team allocation questionnaire template not found",
      },
      {
        error: { code: "TEAM_ALLOCATION_TEMPLATE_INVALID_PURPOSE" },
        status: 400,
        message: "Team allocation questionnaire template must have CUSTOMISED_ALLOCATION purpose",
      },
      {
        error: { code: "INVALID_STUDENT_IDS" },
        status: 400,
        message: "studentIds must be a list of unique student ids",
      },
      {
        error: { code: "STUDENTS_NOT_IN_MODULE" },
        status: 400,
        message: "One or more selected students are not enrolled in this module",
      },
    ] as const;

    for (const entry of cases) {
      (service.createProject as any).mockRejectedValueOnce(entry.error);
      const res = mockResponse();
      await createProjectHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(entry.status);
      expect(res.json).toHaveBeenCalledWith({ error: entry.message });
    }
  });
});
