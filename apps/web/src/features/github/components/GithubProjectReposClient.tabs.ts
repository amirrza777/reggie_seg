export const GITHUB_PROJECT_REPOS_TABS = [
  { key: "repositories", label: "Repositories" },
  { key: "my-commits", label: "My commits" },
  { key: "branches", label: "Branches" },
  { key: "configurations", label: "Configurations" },
] as const;

export type GithubProjectReposTabKey = (typeof GITHUB_PROJECT_REPOS_TABS)[number]["key"];

