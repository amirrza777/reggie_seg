import { describe, expect, it } from "vitest";
import { GITHUB_PROJECT_REPOS_TABS, type GithubProjectReposTabKey } from "./GithubProjectReposClient.tabs";

describe("GithubProjectReposClient.tabs", () => {
  it("defines the expected tab order and labels", () => {
    expect(GITHUB_PROJECT_REPOS_TABS).toEqual([
      { key: "repositories", label: "Repositories" },
      { key: "my-commits", label: "My commits" },
      { key: "branches", label: "Branches" },
      { key: "configurations", label: "Configurations" },
    ]);
  });

  it("keeps tab keys assignable to the exported tab key type", () => {
    const keys: GithubProjectReposTabKey[] = GITHUB_PROJECT_REPOS_TABS.map((tab) => tab.key);
    expect(keys).toEqual(["repositories", "my-commits", "branches", "configurations"]);
  });
});
