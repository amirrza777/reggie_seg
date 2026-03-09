import { beforeEach, describe, expect, it, vi } from "vitest";

const apiFetchMock = vi.fn();

vi.mock("@/shared/api/http", () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import { linkRepository, listCommits } from "./client";

describe("repos api client", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("posts repository link payload", async () => {
    const payload = { name: "repo", url: "https://github.com/acme/repo" };
    apiFetchMock.mockResolvedValue({ id: "r1", ...payload });

    await linkRepository(payload);

    expect(apiFetchMock).toHaveBeenCalledWith("/repos", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  });

  it("lists commits for one repo", async () => {
    const commits = [{ id: "c1", message: "Init", author: "Ayan", date: "2026-01-01T00:00:00.000Z" }];
    apiFetchMock.mockResolvedValue(commits);

    const result = await listCommits("repo-1");

    expect(apiFetchMock).toHaveBeenCalledWith("/repos/repo-1/commits");
    expect(result).toEqual(commits);
  });
});
