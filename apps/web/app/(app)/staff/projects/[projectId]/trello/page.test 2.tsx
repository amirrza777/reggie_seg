import { describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import StaffProjectTrelloPage from "./page";

class RedirectSentinel extends Error {}

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new RedirectSentinel();
  }),
}));

const redirectMock = vi.mocked(redirect);

describe("StaffProjectTrelloPage", () => {
  it("redirects staff trello entry route to the project overview", async () => {
    await expect(
      StaffProjectTrelloPage({
        params: Promise.resolve({ projectId: "my project" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/staff/projects/my%20project");
  });
});
