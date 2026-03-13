import { describe, expect, it } from "vitest";
import * as service from "./service.js";
import { GithubServiceError } from "./errors.js";

describe("github service barrel exports", () => {
  it("re-exports primary service functions and error class", () => {
    expect(typeof service.linkGithubRepositoryToProject).toBe("function");
    expect(typeof service.analyseProjectGithubRepository).toBe("function");
    expect(typeof service.listProjectGithubRepositorySnapshots).toBe("function");
    expect(typeof service.listLiveProjectGithubRepositoryBranches).toBe("function");
    expect(service.GithubServiceError).toBe(GithubServiceError);
  });
});
