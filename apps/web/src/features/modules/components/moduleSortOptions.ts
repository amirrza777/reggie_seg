export type ModuleSortKey = "alphabetical" | "teamCount" | "projectCount" | "accessLevel";

export const MODULE_SORT_OPTIONS: Array<{ value: ModuleSortKey; label: string }> = [
  { value: "alphabetical", label: "Alphabetical (A-Z)" },
  { value: "teamCount", label: "Team count (high to low)" },
  { value: "projectCount", label: "Project count (high to low)" },
  { value: "accessLevel", label: "Access level" },
];
