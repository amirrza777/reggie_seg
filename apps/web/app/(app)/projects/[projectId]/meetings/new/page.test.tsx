import { describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import ProjectMeetingsNewPage from "./page";

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

describe("ProjectMeetingsNewPage", () => {
  it("redirects to meetings with new tab", async () => {
    await expect(
      ProjectMeetingsNewPage({ params: Promise.resolve({ projectId: "42" }) }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/projects/42/meetings?tab=new");
  });

  it("encodes project ids before redirecting", async () => {
    await expect(
      ProjectMeetingsNewPage({ params: Promise.resolve({ projectId: "team/alpha" }) }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/projects/team%2Falpha/meetings?tab=new");
  });
});
