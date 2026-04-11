import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();
const mapApiQuestionsToQuestionsMock = vi.fn();
const mapApiAssessmentToPeerAssessmentMock = vi.fn();
const mapApiAssessmentToPeerAssessmentReceivedMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

vi.mock("./mapper", () => ({
  mapApiQuestionsToQuestions: (...args: unknown[]) => mapApiQuestionsToQuestionsMock(...args),
  mapApiAssessmentToPeerAssessment: (...args: unknown[]) => mapApiAssessmentToPeerAssessmentMock(...args),
  mapApiAssessmentToPeerAssessmentReceived: (...args: unknown[]) =>
    mapApiAssessmentToPeerAssessmentReceivedMock(...args),
}));

import {
  createPeerAssessment,
  getPeerAssessment,
  getPeerAssessmentById,
  getPeerAssessmentData,
  getPeerAssessmentsForUser,
  getPeerAssessmentsReceivedForUser,
  getQuestionsByProject,
  getTeammates,
  updatePeerAssessment,
} from "./client";

describe("peer assessment api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    mapApiQuestionsToQuestionsMock.mockReset();
    mapApiAssessmentToPeerAssessmentMock.mockReset();
    mapApiAssessmentToPeerAssessmentReceivedMock.mockReset();
  });

  it("fetches teammates for a team", async () => {
    apiFetchMock.mockResolvedValue([]);

    await getTeammates(7, 55);

    expect(apiFetchMock).toHaveBeenCalledWith("/peer-assessments/teams/55/teammates?userId=7");
  });

  it("creates peer assessment records", async () => {
    apiFetchMock.mockResolvedValue({ ok: true });
    const payload = {
      projectId: "1",
      teamId: "2",
      reviewerUserId: "3",
      revieweeUserId: "4",
      templateId: "5",
      answersJson: [{ question: "q1", answer: "A" }],
    };

    await createPeerAssessment(payload as never);

    expect(apiFetchMock).toHaveBeenCalledWith("/peer-assessments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  });

  it("builds the query string for peer-assessment lookup", async () => {
    apiFetchMock.mockResolvedValue({});

    await getPeerAssessment(9, 10, 11, 12);

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/peer-assessments?projectId=9&teamId=10&reviewerId=11&revieweeId=12",
    );
  });

  it("updates peer assessment by converting answers record to array payload", async () => {
    apiFetchMock.mockResolvedValue({ ok: true });

    await updatePeerAssessment(99, {
      teamwork: "great",
      score: 5,
      present: true,
      note: null,
    });

    expect(apiFetchMock).toHaveBeenCalledWith("/peer-assessments/99", {
      method: "PUT",
      body: JSON.stringify({
        answersJson: [
          { question: "teamwork", answer: "great" },
          { question: "score", answer: 5 },
          { question: "present", answer: true },
          { question: "note", answer: null },
        ],
      }),
    });
  });

  it("maps peer-assessment lookups to domain type", async () => {
    const raw = { id: 1 };
    const mapped = { id: "1" };
    apiFetchMock.mockResolvedValue(raw);
    mapApiAssessmentToPeerAssessmentMock.mockReturnValue(mapped);

    const result = await getPeerAssessmentData(1, 2, 3, 4);

    expect(mapApiAssessmentToPeerAssessmentMock).toHaveBeenCalledWith(raw);
    expect(result).toEqual(mapped);
  });

  it("maps user assessments arrays and returns empty array for non-arrays", async () => {
    mapApiAssessmentToPeerAssessmentMock.mockImplementation((raw) => ({ mappedId: raw.id }));
    apiFetchMock.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

    const mapped = await getPeerAssessmentsForUser(7, 21);

    expect(apiFetchMock).toHaveBeenCalledWith("/peer-assessments/projects/21/user/7");
    expect(mapped).toEqual([{ mappedId: 1 }, { mappedId: 2 }]);

    apiFetchMock.mockResolvedValueOnce({ nope: true });
    const empty = await getPeerAssessmentsForUser(7, 21);
    expect(empty).toEqual([]);
  });

  it("maps received assessments arrays and returns empty array for non-arrays", async () => {
    mapApiAssessmentToPeerAssessmentReceivedMock.mockImplementation((raw) => ({ receivedId: raw.id }));
    apiFetchMock.mockResolvedValueOnce([{ id: 8 }]);

    const mapped = await getPeerAssessmentsReceivedForUser(7, 21);

    expect(apiFetchMock).toHaveBeenCalledWith("/peer-assessments/projects/21/reviewee/7");
    expect(mapped).toEqual([{ receivedId: 8 }]);

    apiFetchMock.mockResolvedValueOnce(null);
    const empty = await getPeerAssessmentsReceivedForUser(7, 21);
    expect(empty).toEqual([]);
  });

  it("maps project questionnaire questions", async () => {
    const raw = { questions: [{ id: 1 }] };
    const mapped = [{ id: 1, text: "Q1" }];
    apiFetchMock.mockResolvedValue(raw);
    mapApiQuestionsToQuestionsMock.mockReturnValue(mapped);

    const result = await getQuestionsByProject("42");

    expect(apiFetchMock).toHaveBeenCalledWith("/projects/42/questions");
    expect(mapApiQuestionsToQuestionsMock).toHaveBeenCalledWith(raw);
    expect(result).toEqual(mapped);
  });

  it("maps peer assessment by id", async () => {
    const raw = { id: 44 };
    const mapped = { id: "44" };
    apiFetchMock.mockResolvedValue(raw);
    mapApiAssessmentToPeerAssessmentMock.mockReturnValue(mapped);

    const result = await getPeerAssessmentById(44);

    expect(apiFetchMock).toHaveBeenCalledWith("/peer-assessments/44");
    expect(mapApiAssessmentToPeerAssessmentMock).toHaveBeenCalledWith(raw);
    expect(result).toEqual(mapped);
  });
});
