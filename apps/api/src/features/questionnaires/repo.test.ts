import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  createQuestionnaireTemplate,
  getQuestionnaireTemplateById,
  getAllQuestionnaireTemplates,
  updateQuestionnaireTemplate,
  deleteQuestionnaireTemplate,
} from "./repo.js";

//Mocks prisma so we only test repo logic
vi.mock("../../shared/db.js", () => ({
  prisma: {
    questionnaireTemplate: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    question: {
      findMany: vi.fn(),
      update: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../../shared/db.js";

describe("QuestionnaireTemplate repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  //Tests creation of template
  it("creates a template with ordered questions", async () => {
    const questions = [
      { label: "Q1", type: "text" },
      { label: "Q2", type: "number", configs: { min: 1 } },
    ];

    await createQuestionnaireTemplate("Template A", questions, 10, false);

    //ensures questions are mapped correctly with order and configs fallback
    expect(prisma.questionnaireTemplate.create).toHaveBeenCalledWith({
      data: {
        templateName: "Template A",
        isPublic: false,
        ownerId: 10,
        questions: {
          create: [
            { label: "Q1", type: "text", order: 0, configs: null },
            { label: "Q2", type: "number", order: 1, configs: { min: 1 } },
          ],
        },
      },
    });
  });

  //Gets questionnaire by id with questions in right order
  it("fetches a template including ordered questions", async () => {
    await getQuestionnaireTemplateById(5);

    expect(prisma.questionnaireTemplate.findFirst).toHaveBeenCalledWith({
      where: { id: 5, isPublic: true },
      include: { questions: { orderBy: { order: "asc" } } },
    });
  });

  //Gets all templates
  it("fetches all templates with their questions", async () => {
    await getAllQuestionnaireTemplates();

    expect(prisma.questionnaireTemplate.findMany).toHaveBeenCalledWith({
      where: { isPublic: true },
      include: { questions: { orderBy: { order: "asc" } } },
    });
  });

  //Tests updating a question
  it("updates template name and handles update/create/delete logic", async () => {
    const mockTx = {
      questionnaireTemplate: { update: vi.fn() },
      question: {
        findMany: vi.fn(),
        update: vi.fn(),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    //Simulates prisma transaction wrapper
    (prisma.$transaction as any).mockImplementation(async (cb: any) =>
      cb(mockTx)
    );

    mockTx.question.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const incomingQuestions = [
      { id: 1, label: "Updated Q1", type: "text" }, //updated question
      { label: "New Q3", type: "number" }, //new question in questionnaire
    ];

    await updateQuestionnaireTemplate(10, "Updated Template", incomingQuestions);

    //Updates template name
    expect(mockTx.questionnaireTemplate.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { templateName: "Updated Template" },
    });

    expect(mockTx.question.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        label: "Updated Q1",
        type: "text",
        configs: Prisma.JsonNull,
        order: 0,
      },
    });

    //Checks if new question inserted
    expect(mockTx.question.createMany).toHaveBeenCalled();

    //Checks if removed question deleted
    expect(mockTx.question.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [2] } },
    });
  });

  it("does not create questions if there are no new ones", async () => {
    const mockTx = {
      questionnaireTemplate: { update: vi.fn() },
      question: {
        findMany: vi.fn(),
        update: vi.fn(),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    (prisma.$transaction as any).mockImplementation(async (cb: any) =>
      cb(mockTx)
    );

    mockTx.question.findMany.mockResolvedValue([{ id: 1 }]);

    const incomingQuestions = [
      { id: 1, label: "Updated Q1", type: "text" },
    ];

    await updateQuestionnaireTemplate(10, "Name", incomingQuestions);

    //Ensures createMany is skipped when not needed
    expect(mockTx.question.createMany).not.toHaveBeenCalled();
  });

  it("does not delete questions if none were removed", async () => {
    const mockTx = {
      questionnaireTemplate: { update: vi.fn() },
      question: {
        findMany: vi.fn(),
        update: vi.fn(),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    (prisma.$transaction as any).mockImplementation(async (cb: any) =>
      cb(mockTx)
    );

    mockTx.question.findMany.mockResolvedValue([{ id: 1 }]);

    const incomingQuestions = [
      { id: 1, label: "Same Q1", type: "text" },
    ];

    await updateQuestionnaireTemplate(10, "Name", incomingQuestions);

    //Ensures createMany is skipped when not needed
    expect(mockTx.question.deleteMany).not.toHaveBeenCalled();
  });

  //tests deletion of template
  it("deletes template by id", async () => {
    await deleteQuestionnaireTemplate(20);

    expect(prisma.questionnaireTemplate.delete).toHaveBeenCalledWith({
      where: { id: 20 },
    });
  });
});
