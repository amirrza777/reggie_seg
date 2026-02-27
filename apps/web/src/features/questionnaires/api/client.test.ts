import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiFetch } from "@/shared/api/http";
import {
  createQuestionnaire,
  deleteQuestionnaire,
  getMyQuestionnaires,
  getPublicQuestionnairesFromOthers,
  getQuestionnaireById,
  updateQuestionnaire,
  usePublicQuestionnaire,
} from "./client";

vi.mock("@/shared/api/http", () => ({
  apiFetch: vi.fn(),
}));

describe("questionnaires api client", () => {
  const apiFetchMock = vi.mocked(apiFetch);

  const payload = {
    templateName: "Template",
    isPublic: true,
    questions: [{ label: "Q1", type: "text" as const }],
  };

  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({} as any);
  });

  it("gets my questionnaires", async () => {
    await getMyQuestionnaires();
    expect(apiFetchMock).toHaveBeenCalledWith("/questionnaires/mine");
  });

  it("gets public questionnaires from other users", async () => {
    await getPublicQuestionnairesFromOthers();
    expect(apiFetchMock).toHaveBeenCalledWith("/questionnaires/public/others");
  });

  it("gets questionnaire by id", async () => {
    await getQuestionnaireById(12);
    expect(apiFetchMock).toHaveBeenCalledWith("/questionnaires/12");
  });

  it("creates questionnaire", async () => {
    await createQuestionnaire(payload);
    expect(apiFetchMock).toHaveBeenCalledWith("/questionnaires/new", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  });

  it("updates questionnaire", async () => {
    await updateQuestionnaire(12, payload);
    expect(apiFetchMock).toHaveBeenCalledWith("/questionnaires/12", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  });

  it("deletes questionnaire", async () => {
    await deleteQuestionnaire(12);
    expect(apiFetchMock).toHaveBeenCalledWith("/questionnaires/12", {
      method: "DELETE",
    });
  });

  it("uses public questionnaire", async () => {
    await usePublicQuestionnaire(12);
    expect(apiFetchMock).toHaveBeenCalledWith("/questionnaires/12/use", {
      method: "POST",
    });
  });

  it("supports string ids for delete and use endpoints", async () => {
    await deleteQuestionnaire("abc");
    await usePublicQuestionnaire("abc");

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/questionnaires/abc", {
      method: "DELETE",
    });
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/questionnaires/abc/use", {
      method: "POST",
    });
  });

  it("returns apiFetch results for list endpoints", async () => {
    apiFetchMock.mockResolvedValueOnce([{ id: 1 }] as any).mockResolvedValueOnce([{ id: 2 }] as any);

    const mine = await getMyQuestionnaires();
    const publicOthers = await getPublicQuestionnairesFromOthers();

    expect(mine).toEqual([{ id: 1 }]);
    expect(publicOthers).toEqual([{ id: 2 }]);
  });
});

