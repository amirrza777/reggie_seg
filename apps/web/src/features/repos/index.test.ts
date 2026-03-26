import { describe, expect, it, vi } from "vitest";

vi.mock("./api/client", () => ({
  reposClientSentinel: "repos-client",
}));
vi.mock("./components/CommitList", () => ({
  CommitList: () => null,
}));
vi.mock("./components/RepoLinkForm", () => ({
  RepoLinkForm: () => null,
}));
vi.mock("./types", () => ({
  reposTypesSentinel: "repos-types",
}));

describe("repos index barrel", () => {
  it("re-exports module surface", async () => {
    const mod = await import("./index");
    expect(mod.reposClientSentinel).toBe("repos-client");
    expect(mod.CommitList).toBeTypeOf("function");
    expect(mod.RepoLinkForm).toBeTypeOf("function");
    expect(mod.reposTypesSentinel).toBe("repos-types");
  });
});
