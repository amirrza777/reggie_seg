import { afterEach, describe, expect, it, vi } from "vitest";

async function importDataWithMocks(options: {
  randSentenceImpl: (args?: unknown) => string | string[];
  randFirstNameImpl?: () => string;
  randLastNameImpl?: () => string;
  volumeOverrides?: Partial<Record<
    | "SEED_MODULE_COUNT"
    | "SEED_PROJECT_COUNT"
    | "SEED_QUESTIONS_PER_TEMPLATE"
    | "SEED_STAFF_COUNT"
    | "SEED_STUDENT_COUNT"
    | "SEED_TEAMS_PER_PROJECT"
    | "SEED_TEMPLATE_COUNT",
    number
  >>;
}) {
  vi.resetModules();

  vi.doMock("../../prisma/seed/volumes", () => ({
    SEED_MODULE_COUNT: options.volumeOverrides?.SEED_MODULE_COUNT ?? 2,
    SEED_PROJECT_COUNT: options.volumeOverrides?.SEED_PROJECT_COUNT ?? 3,
    SEED_QUESTIONS_PER_TEMPLATE: options.volumeOverrides?.SEED_QUESTIONS_PER_TEMPLATE ?? 2,
    SEED_STAFF_COUNT: options.volumeOverrides?.SEED_STAFF_COUNT ?? 1,
    SEED_STUDENT_COUNT: options.volumeOverrides?.SEED_STUDENT_COUNT ?? 2,
    SEED_TEAMS_PER_PROJECT: options.volumeOverrides?.SEED_TEAMS_PER_PROJECT ?? 2,
    SEED_TEMPLATE_COUNT: options.volumeOverrides?.SEED_TEMPLATE_COUNT ?? 2,
  }));

  vi.doMock("@ngneat/falso", () => ({
    randSentence: vi.fn(options.randSentenceImpl),
    randFirstName: vi.fn(options.randFirstNameImpl ?? (() => "Alice")),
    randLastName: vi.fn(options.randLastNameImpl ?? (() => "Smith")),
  }));

  return import("../../prisma/seed/data");
}

describe("seed data generation", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("builds project/template/team data with normalized question labels", async () => {
    const data = await importDataWithMocks({
      randSentenceImpl: () => "Generated sentence for labels.",
    });

    expect(data.moduleData).toHaveLength(2);
    expect(data.questionnaireTemplateData).toHaveLength(2);
    expect(data.questionnaireTemplateData[0]?.questions[0]).toMatch(/\?$/);
    expect(data.projectData).toHaveLength(3);
    expect(data.projectData[0]?.name).toMatch(/^Project "/);
    expect(data.teamData).toHaveLength(6);
  });

  it("falls back safely when sentence generation is empty/invalid", async () => {
    const data = await importDataWithMocks({
      randSentenceImpl: (args?: any) => {
        if (args?.length) return [".", "??"];
        return [""];
      },
      randFirstNameImpl: () => "Q",
      randLastNameImpl: () => "Z",
    });

    expect(data.questionnaireTemplateData.flatMap((t) => t.questions).every((q) => q.length > 1)).toBe(true);
    expect(data.projectData.every((project) => project.name.startsWith('Project "'))).toBe(true);
  });

  it("applies numeric cycle suffixes when module/template counts exceed base lists", async () => {
    const data = await importDataWithMocks({
      randSentenceImpl: () => "Generated sentence",
      volumeOverrides: {
        SEED_MODULE_COUNT: 8,
        SEED_TEMPLATE_COUNT: 7,
        SEED_PROJECT_COUNT: 10,
      },
    });

    expect(data.moduleData.some((module) => /\s2$/.test(module.name))).toBe(true);
    expect(data.questionnaireTemplateData.some((template) => /\s2$/.test(template.templateName))).toBe(true);
  });
});
