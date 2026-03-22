import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import {
  acceptInvite,
  applyCustomAllocation,
  applyManualAllocation,
  applyRandomAllocation,
  cancelTeamInvite,
  createTeamForProject,
  declineInvite,
  getCustomAllocationCoverage,
  getCustomAllocationQuestionnaires,
  getManualAllocationWorkspace,
  previewCustomAllocation,
  getRandomAllocationPreview,
  getReceivedInvites,
  getTeamInvites,
  sendTeamInvite,
} from "./teamAllocation";

describe("team allocation api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({});
  });

  it("sends team invite", async () => {
    await sendTeamInvite(8, 4, "student@example.com", "join");

    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/invites", {
      method: "POST",
      body: JSON.stringify({ teamId: 8, inviterId: 4, inviteeEmail: "student@example.com", message: "join" }),
    });
  });

  it("cancels and responds to invites", async () => {
    await cancelTeamInvite("inv-1");
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/invites/inv-1/cancel", {
      method: "PATCH",
    });

    await acceptInvite("inv-2");
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/invites/inv-2/accept", {
      method: "PATCH",
    });

    await declineInvite("inv-3");
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/invites/inv-3/decline", {
      method: "PATCH",
    });
  });

  it("fetches invites by team and for current user", async () => {
    await getTeamInvites(77);
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/teams/77/invites");

    await getReceivedInvites();
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/invites/received");
  });

  it("creates team for project", async () => {
    await createTeamForProject(12, "Team Delta");
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/teams/for-project", {
      method: "POST",
      body: JSON.stringify({ projectId: 12, teamName: "Team Delta" }),
    });
  });

  it("fetches random allocation preview with teamCount (seed is ignored)", async () => {
    await getRandomAllocationPreview(55, 4, 1234);
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/team-allocation/projects/55/random-preview?teamCount=4",
      { cache: "no-store" }
    );
  });

  it("fetches random allocation preview without seed", async () => {
    await getRandomAllocationPreview(91, 3);
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/projects/91/random-preview?teamCount=3", {
      cache: "no-store",
    });
  });

  it("fetches manual allocation workspace", async () => {
    await getManualAllocationWorkspace(91);
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/projects/91/manual-workspace", {
      cache: "no-store",
    });
  });

  it("fetches custom allocation questionnaires and coverage", async () => {
    await getCustomAllocationQuestionnaires(91);
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/projects/91/custom-questionnaires", {
      cache: "no-store",
    });

    await getCustomAllocationCoverage(91, 33);
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/team-allocation/projects/91/custom-coverage?questionnaireTemplateId=33",
      { cache: "no-store" },
    );
  });

  it("applies manual allocation with team name and selected students", async () => {
    await applyManualAllocation(55, "Team Gamma", [4, 8, 11]);
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/projects/55/manual-allocate", {
      method: "POST",
      body: JSON.stringify({ teamName: "Team Gamma", studentIds: [4, 8, 11] }),
    });
  });

  it("applies random allocation with team count (seed is ignored)", async () => {
    await applyRandomAllocation(55, 4, 1234);
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/projects/55/random-allocate", {
      method: "POST",
      body: JSON.stringify({ teamCount: 4 }),
    });

    await applyRandomAllocation(55, 4);
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/projects/55/random-allocate", {
      method: "POST",
      body: JSON.stringify({ teamCount: 4 }),
    });

    await applyRandomAllocation(55, 4, 1234, ["Random Team 1", "Random Team 2", "Random Team 3", "Random Team 4"]);
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/projects/55/random-allocate", {
      method: "POST",
      body: JSON.stringify({
        teamCount: 4,
        teamNames: ["Random Team 1", "Random Team 2", "Random Team 3", "Random Team 4"],
      }),
    });
  });

  it("previews and applies custom allocation", async () => {
    await previewCustomAllocation(55, {
      questionnaireTemplateId: 8,
      teamCount: 4,
      seed: 1234,
      nonRespondentStrategy: "distribute_randomly",
      criteria: [{ questionId: 101, strategy: "diversify", weight: 4 }],
    });
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/projects/55/custom-preview", {
      method: "POST",
      body: JSON.stringify({
        questionnaireTemplateId: 8,
        teamCount: 4,
        nonRespondentStrategy: "distribute_randomly",
        criteria: [{ questionId: 101, strategy: "diversify", weight: 4 }],
      }),
    });

    await applyCustomAllocation(55, {
      previewId: "custom-preview-1",
      teamNames: ["Team Orion", "Team Vega"],
    });
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/projects/55/custom-allocate", {
      method: "POST",
      body: JSON.stringify({
        previewId: "custom-preview-1",
        teamNames: ["Team Orion", "Team Vega"],
      }),
    });
  });
});
