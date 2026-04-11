import { describe, expect, it } from "vitest";
import { archiveTableEmptyMessage } from "./archiveEmptyMessages";

describe("archiveTableEmptyMessage", () => {
  it("returns module scope messages", () => {
    expect(archiveTableEmptyMessage("modules", "active", "all")).toBe("No active modules.");
    expect(archiveTableEmptyMessage("modules", "archived", "all")).toBe("No archived modules.");
    expect(archiveTableEmptyMessage("modules", "all", "all")).toBe("No modules found.");
  });

  it("returns project scope messages", () => {
    expect(archiveTableEmptyMessage("projects", "all", "active")).toBe(
      "No active projects (the module and the project must both be unarchived).",
    );
    expect(archiveTableEmptyMessage("projects", "all", "archived")).toBe(
      "No archived projects (the module or the project is archived).",
    );
    expect(archiveTableEmptyMessage("projects", "all", "all")).toBe("No projects found.");
  });
});
