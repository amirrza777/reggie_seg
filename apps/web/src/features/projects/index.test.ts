import { describe, expect, it, vi } from "vitest";

vi.mock("./api/client", () => ({
  projectsClientSentinel: "projects-client",
}));
vi.mock("./components/ProjectNav", () => ({
  ProjectNav: () => null,
}));
vi.mock("./components/ProjectOverview", () => ({
  ProjectOverview: () => null,
}));
vi.mock("./types", () => ({
  projectTypesSentinel: "projects-types",
}));

describe("projects index barrel", () => {
  it("re-exports module surface", async () => {
    const mod = await import("./index");
    expect(mod.projectsClientSentinel).toBe("projects-client");
    expect(mod.ProjectNav).toBeTypeOf("function");
    expect(mod.ProjectOverview).toBeTypeOf("function");
    expect(mod.projectTypesSentinel).toBe("projects-types");
  });
});
