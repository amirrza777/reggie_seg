import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import {
  getModuleDetails,
  getModulesSummary,
  getStudentDetails,
  getTeamDetails,
  saveStudentMarking,
  saveTeamMarking,
} from "./client";

describe("staff peerAssessments api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("loads modules summary with no-store cache", async () => {
    apiFetchMock.mockResolvedValue([{ title: "A", submitted: 1, expected: 2 }]);

    const result = await getModulesSummary(9);

    expect(apiFetchMock).toHaveBeenCalledWith("/staff/peer-assessments/modules?staffId=9", {
      cache: "no-store",
    });
    expect(result).toEqual([{ title: "A", submitted: 1, expected: 2 }]);
  });

  it("loads module details", async () => {
    apiFetchMock.mockResolvedValue({ module: { id: 4 }, teams: [] });

    await getModuleDetails(9, 4);

    expect(apiFetchMock).toHaveBeenCalledWith("/staff/peer-assessments/module/4?staffId=9", {
      cache: "no-store",
    });
  });

  it("loads team details", async () => {
    apiFetchMock.mockResolvedValue({ team: { id: 2 }, students: [] });

    await getTeamDetails(7, 3, 2);

    expect(apiFetchMock).toHaveBeenCalledWith("/staff/peer-assessments/module/3/team/2?staffId=7", {
      cache: "no-store",
    });
  });

  it("loads student details", async () => {
    apiFetchMock.mockResolvedValue({ student: { id: 5 } });

    await getStudentDetails(7, 3, 2, 5);

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/staff/peer-assessments/module/3/team/2/student/5?staffId=7",
      { cache: "no-store" },
    );
  });

  it("saves team marking payload", async () => {
    apiFetchMock.mockResolvedValue({ id: 1 });

    await saveTeamMarking(1, 2, 3, { mark: 80, formativeFeedback: "Strong work" });

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/staff/peer-assessments/module/2/team/3/marking?staffId=1",
      {
        method: "PUT",
        body: JSON.stringify({ mark: 80, formativeFeedback: "Strong work" }),
      },
    );
  });

  it("saves student marking payload", async () => {
    apiFetchMock.mockResolvedValue({ id: 1 });

    await saveStudentMarking(1, 2, 3, 4, { mark: null, formativeFeedback: null });

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/staff/peer-assessments/module/2/team/3/student/4/marking?staffId=1",
      {
        method: "PUT",
        body: JSON.stringify({ mark: null, formativeFeedback: null }),
      },
    );
  });
});
