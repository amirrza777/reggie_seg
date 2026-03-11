import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import {
  acceptInvite,
  cancelTeamInvite,
  createTeamForProject,
  declineInvite,
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

  it("fetches random allocation preview with teamCount and seed", async () => {
    await getRandomAllocationPreview(55, 4, 1234);
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/team-allocation/projects/55/random-preview?teamCount=4&seed=1234",
      { cache: "no-store" }
    );
  });

  it("fetches random allocation preview without seed", async () => {
    await getRandomAllocationPreview(91, 3);
    expect(apiFetchMock).toHaveBeenCalledWith("/team-allocation/projects/91/random-preview?teamCount=3", {
      cache: "no-store",
    });
  });
});