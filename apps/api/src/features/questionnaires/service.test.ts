import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createTemplate,
  getTemplate,
  getAllTemplates,
  updateTemplate,
  deleteTemplate,
} from "./service.js";

import * as repo from "./repo.js";

//Mocks the repo layer 
vi.mock("./repo.js", () => ({
  createQuestionnaireTemplate: vi.fn(),
  getQuestionnaireTemplateById: vi.fn(),
  getAllQuestionnaireTemplates: vi.fn(),
  isQuestionnaireTemplateOwnedByUser: vi.fn(),
  updateQuestionnaireTemplate: vi.fn(),
  deleteQuestionnaireTemplate: vi.fn(),
}));

describe("QuestionnaireTemplate service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  //Creating template

  it("forwards createTemplate to repo with correct arguments", async () => {
    (repo.createQuestionnaireTemplate as any).mockResolvedValue({
      id: 1,
    });

    const questions = [{ label: "Q1", type: "text" }];

    const result = await createTemplate("Template A", questions, 10, false);

    //Ensures arguments are passed correctly
    expect(repo.createQuestionnaireTemplate).toHaveBeenCalledWith(
      "Template A",
      questions,
      10,
      false
    );

    //ensures return value is passed through
    expect(result).toEqual({ id: 1 });
  });

  //Tests getting a template by id

  it("forwards getTemplate to repo", async () => {
    (repo.getQuestionnaireTemplateById as any).mockResolvedValue({
      id: 5,
    });

    const result = await getTemplate(5, 12);

    expect(repo.getQuestionnaireTemplateById).toHaveBeenCalledWith(5, 12);
    expect(result).toEqual({ id: 5 });
  });

  //Tesys getting all templates
  it("forwards getAllTemplates to repo", async () => {
    (repo.getAllQuestionnaireTemplates as any).mockResolvedValue([
      { id: 1 },
      { id: 2 },
    ]);

    const result = await getAllTemplates(12);

    expect(repo.getAllQuestionnaireTemplates).toHaveBeenCalledWith(12);
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  //Updating a template

  it("forwards updateTemplate to repo with correct arguments", async () => {
    (repo.isQuestionnaireTemplateOwnedByUser as any).mockResolvedValue(true);
    (repo.updateQuestionnaireTemplate as any).mockResolvedValue(undefined);

    const questions = [
      { id: 1, label: "Updated", type: "text" },
    ];

    await updateTemplate(99, 10, "Updated Template", questions, true);

    expect(repo.isQuestionnaireTemplateOwnedByUser).toHaveBeenCalledWith(10, 99);
    expect(repo.updateQuestionnaireTemplate).toHaveBeenCalledWith(
      10,
      "Updated Template",
      questions,
      true
    );
  });

  //Deleting a template
  it("forwards deleteTemplate to repo", async () => {
    (repo.isQuestionnaireTemplateOwnedByUser as any).mockResolvedValue(true);
    (repo.deleteQuestionnaireTemplate as any).mockResolvedValue(undefined);

    await deleteTemplate(99, 20);

    expect(repo.isQuestionnaireTemplateOwnedByUser).toHaveBeenCalledWith(20, 99);
    expect(repo.deleteQuestionnaireTemplate).toHaveBeenCalledWith(20);
  });
});
