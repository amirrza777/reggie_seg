import { describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import StaffModuleScopedProjectRedirectPage from "./page";

class RedirectSentinel extends Error {}

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new RedirectSentinel();
  }),
}));

const redirectMock = vi.mocked(redirect);

describe("StaffModuleScopedProjectRedirectPage", () => {
  it("redirects to the base staff project route when no nested path is provided", async () => {
    await expect(
      StaffModuleScopedProjectRedirectPage({
        params: Promise.resolve({ projectId: "project 10" }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith("/staff/projects/project%2010");
  });

  it("preserves and encodes nested catch-all path segments", async () => {
    await expect(
      StaffModuleScopedProjectRedirectPage({
        params: Promise.resolve({ projectId: "module/project", path: ["team meetings", "graphs&stats"] }),
      }),
    ).rejects.toBeInstanceOf(RedirectSentinel);

    expect(redirectMock).toHaveBeenCalledWith(
      "/staff/projects/module%2Fproject/team%20meetings/graphs%26stats",
    );
  });
});
