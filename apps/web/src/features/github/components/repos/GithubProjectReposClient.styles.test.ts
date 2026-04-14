import { describe, expect, it } from "vitest";
import { githubProjectReposClientStyles } from "./GithubProjectReposClient.styles";

describe("githubProjectReposClientStyles", () => {
  it("exposes expected style tokens for repo client sections", () => {
    expect(githubProjectReposClientStyles.panel).toMatchObject({
      borderRadius: 12,
      background: "var(--surface)",
    });
    expect(githubProjectReposClientStyles.tabBarPanel.background).toContain("linear-gradient");
    expect(githubProjectReposClientStyles.statusInfo.borderColor).toContain("var(--accent)");
    expect(githubProjectReposClientStyles.statusError.background).toContain("#ef4444");
  });
});
