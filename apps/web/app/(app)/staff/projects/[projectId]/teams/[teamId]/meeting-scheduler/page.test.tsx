import { describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import StaffMeetingSchedulerSectionPage from "./page";

class RedirectSentinel extends Error {
  constructor(readonly path: string) {
    super(path);
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectSentinel(path);
  }),
}));

const redirectMock = vi.mocked(redirect);

describe("StaffMeetingSchedulerSectionPage", () => {
  it("redirects to team-meetings route", async () => {
    await expect(
      StaffMeetingSchedulerSectionPage({ params: Promise.resolve({ projectId: "10", teamId: "20" }) }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/staff/projects/10/teams/20/team-meetings");
  });
});

