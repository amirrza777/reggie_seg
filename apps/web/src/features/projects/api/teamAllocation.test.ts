import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();
vi.mock("@/shared/api/http", () => ({ apiFetch: (...args: unknown[]) => apiFetchMock(...args) }));

import {
  acceptInvite,
  approveAllocationDraft,
  applyCustomAllocation,
  deleteAllocationDraft,
  applyManualAllocation,
  applyRandomAllocation,
  cancelTeamInvite,
  createTeamForProject,
  declineInvite,
  getAllocationDrafts,
  getCustomAllocationCoverage,
  getCustomAllocationQuestionnaires,
  getManualAllocationWorkspace,
  getRandomAllocationPreview,
  getReceivedInvites,
  getTeamInviteEligibleStudents,
  getTeamInvites,
  previewCustomAllocation,
  sendTeamInvite,
  updateAllocationDraft,
} from "./teamAllocation";

function expectFetch(path: string, init?: Record<string, unknown>) {
  if (init === undefined) {
    expect(apiFetchMock).toHaveBeenCalledWith(path);
    return;
  }
  expect(apiFetchMock).toHaveBeenCalledWith(path, init);
}

describe("team allocation api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({});
  });

  it("sends invite payloads and supports legacy inviter overload", async () => {
    await sendTeamInvite(8, 4, "student@example.com", "join");
    expectFetch("/team-allocation/invites", {
      method: "POST",
      body: JSON.stringify({ teamId: 8, inviteeEmail: "student@example.com", message: "join" }),
    });
    await sendTeamInvite(8, "other@example.com", "hello");
    expectFetch("/team-allocation/invites", {
      method: "POST",
      body: JSON.stringify({ teamId: 8, inviteeEmail: "other@example.com", message: "hello" }),
    });
  });

  it.each([
    [cancelTeamInvite, "inv-1", "/team-allocation/invites/inv-1/cancel"],
    [acceptInvite, "inv-2", "/team-allocation/invites/inv-2/accept"],
    [declineInvite, "inv-3", "/team-allocation/invites/inv-3/decline"],
  ])("calls invite transition endpoint %s", async (fn, inviteId, path) => {
    await fn(inviteId);
    expectFetch(path, { method: "PATCH" });
  });

  it("fetches invite lists and creates a team for a project", async () => {
    await getTeamInvites(77);
    expectFetch("/team-allocation/teams/77/invites");
    await getTeamInviteEligibleStudents(77);
    expectFetch("/team-allocation/teams/77/invite-eligible-students");
    await getReceivedInvites();
    expectFetch("/team-allocation/invites/received");
    await createTeamForProject(12, "Team Delta");
    expectFetch("/team-allocation/teams/for-project", {
      method: "POST",
      body: JSON.stringify({ projectId: 12, teamName: "Team Delta" }),
    });
  });

  it("builds random preview URL with optional size constraints", async () => {
    await getRandomAllocationPreview(55, 4, { minTeamSize: 2, maxTeamSize: 5 });
    expectFetch("/team-allocation/projects/55/random-preview?teamCount=4&minTeamSize=2&maxTeamSize=5", {
      cache: "no-store",
    });
    await getRandomAllocationPreview(91, 3);
    expectFetch("/team-allocation/projects/91/random-preview?teamCount=3", { cache: "no-store" });
  });

  it("applies random allocation with optional names and team-size constraints", async () => {
    await applyRandomAllocation(55, 4);
    expectFetch("/team-allocation/projects/55/random-allocate", {
      method: "POST",
      body: JSON.stringify({ teamCount: 4 }),
    });
    await applyRandomAllocation(55, 4, ["A", "B", "C", "D"], { maxTeamSize: 6 });
    expectFetch("/team-allocation/projects/55/random-allocate", {
      method: "POST",
      body: JSON.stringify({ teamCount: 4, teamNames: ["A", "B", "C", "D"], maxTeamSize: 6 }),
    });

    await getRandomAllocationPreview(91, 3, { minTeamSize: 2, maxTeamSize: 4 });
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/team-allocation/projects/91/random-preview?teamCount=3&minTeamSize=2&maxTeamSize=4",
      { cache: "no-store" },
    );
  });

  it("fetches manual workspace and applies manual allocation", async () => {
    await getManualAllocationWorkspace(91, "  jin ");
    expectFetch("/team-allocation/projects/91/manual-workspace?q=jin", { cache: "no-store" });
    await applyManualAllocation(55, "Team Gamma", [4, 8, 11]);
    expectFetch("/team-allocation/projects/55/manual-allocate", {
      method: "POST",
      body: JSON.stringify({ teamName: "Team Gamma", studentIds: [4, 8, 11] }),
    });
  });

  it("fetches questionnaire listing and response coverage", async () => {
    await getCustomAllocationQuestionnaires(91);
    expectFetch("/team-allocation/projects/91/custom-questionnaires", { cache: "no-store" });
    await getCustomAllocationCoverage(91, 33);
    expectFetch("/team-allocation/projects/91/custom-coverage?questionnaireTemplateId=33", {
      cache: "no-store",
    });

    await applyRandomAllocation(55, 4, undefined, { minTeamSize: 1, maxTeamSize: 2 });
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/projects/55/random-allocate", {
      method: "POST",
      body: JSON.stringify({
        teamCount: 4,
        minTeamSize: 1,
        maxTeamSize: 2,
      }),
    });
  });

  it("posts custom preview payload", async () => {
    const payload: any = {
      questionnaireTemplateId: 8,
      teamCount: 4,
      nonRespondentStrategy: "distribute_randomly",
      criteria: [{ questionId: 101, strategy: "diversify", weight: 4 }],
    };
    await previewCustomAllocation(55, payload);
    expectFetch("/team-allocation/projects/55/custom-preview", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  });

  it("posts custom apply payload", async () => {
    await applyCustomAllocation(55, {
      previewId: "custom-preview-1",
      teamNames: ["Team Orion", "Team Vega"],
    });
    expectFetch("/team-allocation/projects/55/custom-allocate", {
      method: "POST",
      body: JSON.stringify({ previewId: "custom-preview-1", teamNames: ["Team Orion", "Team Vega"] }),
    });
  });

  it("calls allocation draft endpoints with optional optimistic payloads", async () => {
    await getAllocationDrafts(55);
    expectFetch("/team-allocation/projects/55/allocation-drafts", { cache: "no-store" });

    await updateAllocationDraft(55, 7, { teamName: "Blue", studentIds: [1], expectedUpdatedAt: "2026-01-01T00:00:00.000Z" });
    expectFetch("/team-allocation/projects/55/allocation-drafts/7", {
      method: "PATCH",
      body: JSON.stringify({ teamName: "Blue", studentIds: [1], expectedUpdatedAt: "2026-01-01T00:00:00.000Z" }),
    });

    await approveAllocationDraft(55, 7, { expectedUpdatedAt: "2026-01-01T00:00:00.000Z" });
    expectFetch("/team-allocation/projects/55/allocation-drafts/7/approve", {
      method: "PATCH",
      body: JSON.stringify({ expectedUpdatedAt: "2026-01-01T00:00:00.000Z" }),
    });

    await deleteAllocationDraft(55, 7);
    expectFetch("/team-allocation/projects/55/allocation-drafts/7", { method: "DELETE" });
  });
});