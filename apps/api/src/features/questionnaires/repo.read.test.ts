import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createQuestionnaireTemplate,
  getQuestionnaireTemplateById,
  getAllQuestionnaireTemplates,
  getMyQuestionnaireTemplates,
  getPublicQuestionnaireTemplatesByOtherUsers,
  isQuestionnaireTemplateOwnedByUser,
  isQuestionnaireTemplateInUse,
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

describe("QuestionnaireTemplate repository read paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a template with ordered questions", async () => {
    const questions = [
      { label: "Q1", type: "text" },
      { label: "Q2", type: "number", configs: { min: 1 } },
    ];

    await createQuestionnaireTemplate("Template A", questions, 10, false);

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

  it("fetches a template including ordered questions", async () => {
    await getQuestionnaireTemplateById(5);

    expect(prisma.questionnaireTemplate.findFirst).toHaveBeenCalledWith({
      where: { id: 5, isPublic: true },
      include: { questions: { orderBy: { order: "asc" } } },
    });
  });

  it("fetches a template by id for requester with public-or-owner visibility", async () => {
    await getQuestionnaireTemplateById(5, 42);

    expect(prisma.questionnaireTemplate.findFirst).toHaveBeenCalledWith({
      where: { id: 5, OR: [{ isPublic: true }, { ownerId: 42 }] },
      include: { questions: { orderBy: { order: "asc" } } },
    });
  });

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

  it("returns false when template is missing in in-use check", async () => {
    (prisma.questionnaireTemplate.findUnique as any).mockResolvedValue(null);

    await expect(isQuestionnaireTemplateInUse(1)).resolves.toBe(false);
    expect(prisma.questionnaireTemplate.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        _count: {
          select: {
            projects: true,
            assessments: true,
          },
        },
      },
    });
  });

  it("returns true when template has project/assessment usage", async () => {
    (prisma.questionnaireTemplate.findUnique as any).mockResolvedValue({
      _count: { projects: 0, assessments: 2 },
    });

    await expect(isQuestionnaireTemplateInUse(2)).resolves.toBe(true);
  });

  it("returns false when template exists but has no usage", async () => {
    (prisma.questionnaireTemplate.findUnique as any).mockResolvedValue({
      _count: { projects: 0, assessments: 0 },
    });

    await expect(isQuestionnaireTemplateInUse(3)).resolves.toBe(false);
  });
});
