export const GITHUB_PROJECT_REPOS_TABS = [
  { key: "team-code-activity", label: "Team code activity" },
  { key: "my-code-activity", label: "My code activity" },
  { key: "my-commits", label: "My commits" },
] as const;

export type GithubProjectReposTabKey = (typeof GITHUB_PROJECT_REPOS_TABS)[number]["key"];
