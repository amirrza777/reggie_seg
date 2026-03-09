import { describe, expect, it } from "vitest";
import * as repo from "./repo.js";

describe("github repo barrel exports", () => {
  it("re-exports account, link, and snapshot repository functions", () => {
    expect(typeof repo.findGithubAccountByUserId).toBe("function");
    expect(typeof repo.isUserInProject).toBe("function");
    expect(typeof repo.findLatestGithubSnapshotByProjectLinkId).toBe("function");
  });
});
