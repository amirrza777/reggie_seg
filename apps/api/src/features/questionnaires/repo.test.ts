import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  createQuestionnaireTemplate,
  getQuestionnaireTemplateById,
  getAllQuestionnaireTemplates,
  getMyQuestionnaireTemplates,
  getPublicQuestionnaireTemplatesByOtherUsers,
  isQuestionnaireTemplateOwnedByUser,
  updateQuestionnaireTemplate,
  deleteQuestionnaireTemplate,
  copyPublicQuestionnaireTemplateToUser,
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

  it("fetches all templates visible to requester", async () => {
    await getAllQuestionnaireTemplates(99);

    expect(prisma.questionnaireTemplate.findMany).toHaveBeenCalledWith({
      where: { OR: [{ isPublic: true }, { ownerId: 99 }] },
      include: { questions: { orderBy: { order: "asc" } } },
    });
  });

  it("fetches my templates by owner id", async () => {
    await getMyQuestionnaireTemplates(14);

    expect(prisma.questionnaireTemplate.findMany).toHaveBeenCalledWith({
      where: { ownerId: 14 },
      include: { questions: { orderBy: { order: "asc" } } },
    });
  });

  it("fetches public templates owned by other users", async () => {
    await getPublicQuestionnaireTemplatesByOtherUsers(14);

    expect(prisma.questionnaireTemplate.findMany).toHaveBeenCalledWith({
      where: { isPublic: true, ownerId: { not: 14 } },
      include: { questions: { orderBy: { order: "asc" } } },
    });
  });

  it("returns true when questionnaire template is owned by user", async () => {
    (prisma.questionnaireTemplate.findFirst as any).mockResolvedValue({ id: 4 });

    await expect(isQuestionnaireTemplateOwnedByUser(4, 88)).resolves.toBe(true);
    expect(prisma.questionnaireTemplate.findFirst).toHaveBeenCalledWith({
      where: { id: 4, ownerId: 88 },
      select: { id: true },
    });
  });

  it("returns false when questionnaire template is not owned by user", async () => {
    (prisma.questionnaireTemplate.findFirst as any).mockResolvedValue(null);

    await expect(isQuestionnaireTemplateOwnedByUser(4, 88)).resolves.toBe(false);
  });

  it("fetches a template by id for requester with public-or-owner visibility", async () => {
    await getQuestionnaireTemplateById(5, 42);

    expect(prisma.questionnaireTemplate.findFirst).toHaveBeenCalledWith({
      where: { id: 5, OR: [{ isPublic: true }, { ownerId: 42 }] },
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

  it("updates template visibility when isPublic is provided", async () => {
    const mockTx = {
      questionnaireTemplate: { update: vi.fn() },
      question: {
        findMany: vi.fn(),
        update: vi.fn(),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(mockTx));
    mockTx.question.findMany.mockResolvedValue([]);

    await updateQuestionnaireTemplate(10, "Visible Template", [], true);

    expect(mockTx.questionnaireTemplate.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { templateName: "Visible Template", isPublic: true },
    });
  });

  it("falls back to order 0 for updates when incomingOrderById lookup is undefined", async () => {
    const mockTx = {
      questionnaireTemplate: { update: vi.fn() },
      question: {
        findMany: vi.fn(),
        update: vi.fn(),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(mockTx));
    mockTx.question.findMany.mockResolvedValue([{ id: 1 }]);

    const mapGetSpy = vi.spyOn(Map.prototype, "get").mockReturnValue(undefined as any);
    try {
      await updateQuestionnaireTemplate(10, "Name", [{ id: 1, label: "Q1", type: "text" }]);
    } finally {
      mapGetSpy.mockRestore();
    }

    expect(mockTx.question.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        label: "Q1",
        type: "text",
        configs: Prisma.JsonNull,
        order: 0,
      },
    });
  });

  it("falls back to order 0 for creates when incomingOrderByRef lookup is undefined", async () => {
    const mockTx = {
      questionnaireTemplate: { update: vi.fn() },
      question: {
        findMany: vi.fn(),
        update: vi.fn(),
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    (prisma.$transaction as any).mockImplementation(async (cb: any) => cb(mockTx));
    mockTx.question.findMany.mockResolvedValue([]);

    const mapGetSpy = vi.spyOn(Map.prototype, "get").mockReturnValue(undefined as any);
    try {
      await updateQuestionnaireTemplate(10, "Name", [{ label: "Q-new", type: "text" }]);
    } finally {
      mapGetSpy.mockRestore();
    }

    expect(mockTx.question.createMany).toHaveBeenCalledWith({
      data: [
        {
          templateId: 10,
          label: "Q-new",
          type: "text",
          order: 0,
          configs: Prisma.JsonNull,
        },
      ],
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

  it("returns null when copying a missing/non-public template", async () => {
    (prisma.questionnaireTemplate.findFirst as any).mockResolvedValue(null);

    await expect(copyPublicQuestionnaireTemplateToUser(10, 2)).resolves.toBeNull();
  });

  it("copies public template to user as private '(Copy)'", async () => {
    (prisma.questionnaireTemplate.findFirst as any).mockResolvedValue({
      templateName: "Source Template",
      questions: [
        { label: "Q1", type: "text", order: 0, configs: null },
        { label: "Q2", type: "rating", order: 1, configs: { min: 1, max: 5 } },
      ],
    });
    (prisma.questionnaireTemplate.create as any).mockResolvedValue({ id: 91 });

    const result = await copyPublicQuestionnaireTemplateToUser(10, 2);

    expect(prisma.questionnaireTemplate.findFirst).toHaveBeenCalledWith({
      where: { id: 10, isPublic: true },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    expect(prisma.questionnaireTemplate.create).toHaveBeenCalledWith({
      data: {
        templateName: "Source Template (Copy)",
        isPublic: false,
        ownerId: 2,
        questions: {
          create: [
            { label: "Q1", type: "text", order: 0, configs: null },
            { label: "Q2", type: "rating", order: 1, configs: { min: 1, max: 5 } },
          ],
        },
      },
      select: { id: true },
    });

    expect(result).toEqual({ id: 91 });
  });
});
