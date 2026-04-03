import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  updateQuestionnaireTemplate,
  deleteQuestionnaireTemplate,
  copyPublicQuestionnaireTemplateToUser,
} from "./repo.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    questionnaireTemplate: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
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

describe("QuestionnaireTemplate repository mutation paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    (prisma.$transaction as any).mockImplementation(async (cb: any) =>
      cb(mockTx)
    );

    mockTx.question.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const incomingQuestions = [
      { id: 1, label: "Updated Q1", type: "text" },
      { label: "New Q3", type: "number" },
    ];

    await updateQuestionnaireTemplate(10, "Updated Template", incomingQuestions);

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

    expect(mockTx.question.createMany).toHaveBeenCalled();
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

    expect(mockTx.question.deleteMany).not.toHaveBeenCalled();
  });

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
        purpose: "GENERAL_PURPOSE",
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

