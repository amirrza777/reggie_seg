import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deactivateProjectGithubRepositoryLink,
  findActiveProjectGithubRepositoryLink,
  findProjectGithubRepositoryLinkById,
  isUserInProject,
  listProjectGithubIdentityCandidates,
  listProjectGithubRepositoryLinks,
  updateProjectGithubRepositorySyncSettings,
  upsertGithubRepository,
  upsertProjectGithubRepositoryLink,
} from "./repo.links.js";
import { prisma } from "../../shared/db.js";

vi.mock("../../shared/db.js", () => ({
  prisma: {
    teamAllocation: { findFirst: vi.fn(), findMany: vi.fn() },
    githubRepository: { upsert: vi.fn() },
    projectGithubRepository: { upsert: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

describe("github repo.links", () => {
  beforeEach(() => vi.clearAllMocks());

  it("checks membership and maps identity candidates", async () => {
    (prisma.teamAllocation.findFirst as any).mockResolvedValue({ userId: 1 });
    await expect(isUserInProject(1, 2)).resolves.toBe(true);

    (prisma.teamAllocation.findMany as any).mockResolvedValue([
      { userId: 1, user: { githubAccount: { login: "alice", email: "a@example.com" } } },
      { userId: 2, user: { githubAccount: null } },
    ]);
    await expect(listProjectGithubIdentityCandidates(3)).resolves.toEqual([
      { userId: 1, githubLogin: "alice", githubEmail: "a@example.com" },
      { userId: 2, githubLogin: null, githubEmail: null },
    ]);
  });

  it("upserts repository and project link", async () => {
    await upsertGithubRepository({
      githubRepoId: BigInt(10),
      ownerLogin: "org",
      name: "repo",
      fullName: "org/repo",
      htmlUrl: "https://github.com/org/repo",
      isPrivate: false,
      defaultBranch: "main",
    });
    expect(prisma.githubRepository.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { githubRepoId: BigInt(10) } }));

    await upsertProjectGithubRepositoryLink(1, 2, 3);
    expect(prisma.projectGithubRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId_githubRepositoryId: { projectId: 1, githubRepositoryId: 2 } },
        create: expect.objectContaining({ linkedByUserId: 3, isActive: true }),
      })
    );
  });

  it("lists/finds/updates/deactivates links", async () => {
    await listProjectGithubRepositoryLinks(1);
    expect(prisma.projectGithubRepository.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { projectId: 1, isActive: true } }));

    await findActiveProjectGithubRepositoryLink(1);
    expect(prisma.projectGithubRepository.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { projectId: 1, isActive: true } }));

    await findProjectGithubRepositoryLinkById(5);
    expect(prisma.projectGithubRepository.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 5 } }));

    await updateProjectGithubRepositorySyncSettings({ linkId: 5, autoSyncEnabled: true, syncIntervalMinutes: 30 });
    expect(prisma.projectGithubRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ autoSyncEnabled: true, syncIntervalMinutes: 30, nextSyncAt: expect.any(Date) }),
      })
    );

    await deactivateProjectGithubRepositoryLink(5);
    expect(prisma.projectGithubRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 }, data: expect.objectContaining({ isActive: false, autoSyncEnabled: false }) })
    );
  });
});
