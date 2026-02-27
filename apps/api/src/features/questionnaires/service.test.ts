import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createTemplate,
  getTemplate,
  getAllTemplates,
  getMyTemplates,
  getPublicTemplatesFromOtherUsers,
  updateTemplate,
  deleteTemplate,
  usePublicTemplate,
} from "./service.js";

import * as repo from "./repo.js";

//Mocks the repo layer 
vi.mock("./repo.js", () => ({
  createQuestionnaireTemplate: vi.fn(),
  copyPublicQuestionnaireTemplateToUser: vi.fn(),
  getQuestionnaireTemplateById: vi.fn(),
  getAllQuestionnaireTemplates: vi.fn(),
  getMyQuestionnaireTemplates: vi.fn(),
  getPublicQuestionnaireTemplatesByOtherUsers: vi.fn(),
  isQuestionnaireTemplateOwnedByUser: vi.fn(),
  isQuestionnaireTemplateInUse: vi.fn(),
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

  it("forwards getMyTemplates to repo", async () => {
    (repo.getMyQuestionnaireTemplates as any).mockResolvedValue([{ id: 7 }]);

    const result = await getMyTemplates(12);

    expect(repo.getMyQuestionnaireTemplates).toHaveBeenCalledWith(12);
    expect(result).toEqual([{ id: 7 }]);
  });

  it("forwards getPublicTemplatesFromOtherUsers to repo", async () => {
    (repo.getPublicQuestionnaireTemplatesByOtherUsers as any).mockResolvedValue([{ id: 9 }]);

    const result = await getPublicTemplatesFromOtherUsers(21);

    expect(repo.getPublicQuestionnaireTemplatesByOtherUsers).toHaveBeenCalledWith(21);
    expect(result).toEqual([{ id: 9 }]);
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

  it("throws unauthorized when updateTemplate requester is missing", async () => {
    await expect(
      updateTemplate(0, 10, "Updated Template", [{ id: 1, label: "Q", type: "text" }], true)
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(repo.updateQuestionnaireTemplate).not.toHaveBeenCalled();
  });

  it("throws forbidden when updateTemplate requester is not owner", async () => {
    (repo.isQuestionnaireTemplateOwnedByUser as any).mockResolvedValue(false);

    await expect(
      updateTemplate(99, 10, "Updated Template", [{ id: 1, label: "Q", type: "text" }], true)
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.updateQuestionnaireTemplate).not.toHaveBeenCalled();
  });

  //Deleting a template
  it("forwards deleteTemplate to repo", async () => {
    (repo.isQuestionnaireTemplateOwnedByUser as any).mockResolvedValue(true);
    (repo.isQuestionnaireTemplateInUse as any).mockResolvedValue(false);
    (repo.deleteQuestionnaireTemplate as any).mockResolvedValue(undefined);

    await deleteTemplate(99, 20);

    expect(repo.isQuestionnaireTemplateOwnedByUser).toHaveBeenCalledWith(20, 99);
    expect(repo.isQuestionnaireTemplateInUse).toHaveBeenCalledWith(20);
    expect(repo.deleteQuestionnaireTemplate).toHaveBeenCalledWith(20);
  });

  it("throws unauthorized when deleteTemplate requester is missing", async () => {
    await expect(deleteTemplate(0, 20)).rejects.toMatchObject({ statusCode: 401 });
    expect(repo.deleteQuestionnaireTemplate).not.toHaveBeenCalled();
  });

  it("throws forbidden when deleteTemplate requester is not owner", async () => {
    (repo.isQuestionnaireTemplateOwnedByUser as any).mockResolvedValue(false);

    await expect(deleteTemplate(99, 20)).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.deleteQuestionnaireTemplate).not.toHaveBeenCalled();
  });

  it("throws TEMPLATE_IN_USE when deleteTemplate target is in use", async () => {
    (repo.isQuestionnaireTemplateOwnedByUser as any).mockResolvedValue(true);
    (repo.isQuestionnaireTemplateInUse as any).mockResolvedValue(true);

    await expect(deleteTemplate(99, 20)).rejects.toMatchObject({ code: "TEMPLATE_IN_USE" });
    expect(repo.deleteQuestionnaireTemplate).not.toHaveBeenCalled();
  });

  it("throws unauthorized for usePublicTemplate when requester is missing", async () => {
    expect(() => usePublicTemplate(0, 20)).toThrowError("Unauthorized");
    expect(repo.copyPublicQuestionnaireTemplateToUser).not.toHaveBeenCalled();
  });

  it("forwards usePublicTemplate to repo", async () => {
    (repo.copyPublicQuestionnaireTemplateToUser as any).mockResolvedValue({ id: 33 });

    const result = await usePublicTemplate(45, 20);

    expect(repo.copyPublicQuestionnaireTemplateToUser).toHaveBeenCalledWith(20, 45);
    expect(result).toEqual({ id: 33 });
  });
});
