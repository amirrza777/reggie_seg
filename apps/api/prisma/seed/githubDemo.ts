import { SEED_GITHUB_STAFF_EMAIL, SEED_GITHUB_STUDENT_EMAIL } from "./config";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedContext } from "./types";
import { SEED_GITHUB_DEMO_SNAPSHOTS } from "./volumes";

export async function seedGithubDemoPath(context: SeedContext) {
  return withSeedLogging("seedGithubDemoPath", async () => {
    const project = context.projects[0];
    if (!project) {
      return { value: undefined, rows: 0, details: "skipped (no project available)" };
    }

    const [staffUser, studentUser] = await Promise.all([
      prisma.user.findUnique({
        where: { enterpriseId_email: { enterpriseId: context.enterprise.id, email: SEED_GITHUB_STAFF_EMAIL } },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { enterpriseId_email: { enterpriseId: context.enterprise.id, email: SEED_GITHUB_STUDENT_EMAIL } },
        select: { id: true },
      }),
    ]);

    if (!staffUser || !studentUser) {
      return { value: undefined, rows: 0, details: "skipped (missing GitHub demo users)" };
    }

    const staffAccount = await prisma.githubAccount.upsert({
      where: { userId: staffUser.id },
      update: {
        githubUserId: BigInt(910001),
        login: "github-demo-staff",
        email: SEED_GITHUB_STAFF_EMAIL,
        accessTokenEncrypted: "seed-access-token-staff",
        scopes: "repo,read:user",
      },
      create: {
        userId: staffUser.id,
        githubUserId: BigInt(910001),
        login: "github-demo-staff",
        email: SEED_GITHUB_STAFF_EMAIL,
        accessTokenEncrypted: "seed-access-token-staff",
        scopes: "repo,read:user",
      },
      select: { id: true, login: true },
    });

    await prisma.githubAccount.upsert({
      where: { userId: studentUser.id },
      update: {
        githubUserId: BigInt(910002),
        login: "github-demo-student",
        email: SEED_GITHUB_STUDENT_EMAIL,
        accessTokenEncrypted: "seed-access-token-student",
        scopes: "repo,read:user",
      },
      create: {
        userId: studentUser.id,
        githubUserId: BigInt(910002),
        login: "github-demo-student",
        email: SEED_GITHUB_STUDENT_EMAIL,
        accessTokenEncrypted: "seed-access-token-student",
        scopes: "repo,read:user",
      },
      select: { id: true },
    });

    const repository = await prisma.githubRepository.upsert({
      where: { fullName: "reggie-seed/demo-project" },
      update: {
        githubRepoId: BigInt(920001),
        ownerLogin: "reggie-seed",
        ownerType: "Organization",
        name: "demo-project",
        htmlUrl: "https://github.com/reggie-seed/demo-project",
        isPrivate: false,
        isArchived: false,
        defaultBranch: "main",
        description: "Seeded demo repository for GitHub analytics flows.",
        pushedAt: new Date(),
      },
      create: {
        githubRepoId: BigInt(920001),
        ownerLogin: "reggie-seed",
        ownerType: "Organization",
        name: "demo-project",
        fullName: "reggie-seed/demo-project",
        htmlUrl: "https://github.com/reggie-seed/demo-project",
        isPrivate: false,
        isArchived: false,
        defaultBranch: "main",
        description: "Seeded demo repository for GitHub analytics flows.",
        pushedAt: new Date(),
      },
      select: { id: true },
    });

    const link = await prisma.projectGithubRepository.upsert({
      where: {
        projectId_githubRepositoryId: {
          projectId: project.id,
          githubRepositoryId: repository.id,
        },
      },
      update: {
        linkedByUserId: staffUser.id,
        isActive: true,
        autoSyncEnabled: true,
        syncIntervalMinutes: 60,
        lastSyncedAt: new Date(),
        nextSyncAt: new Date(Date.now() + 60 * 60 * 1000),
      },
      create: {
        projectId: project.id,
        githubRepositoryId: repository.id,
        linkedByUserId: staffUser.id,
        isActive: true,
        autoSyncEnabled: true,
        syncIntervalMinutes: 60,
        lastSyncedAt: new Date(),
        nextSyncAt: new Date(Date.now() + 60 * 60 * 1000),
      },
      select: { id: true },
    });

    await prisma.githubRepoSnapshotUserStat.deleteMany({
      where: { snapshot: { projectGithubRepositoryId: link.id } },
    });
    await prisma.githubRepoSnapshotRepoStat.deleteMany({
      where: { snapshot: { projectGithubRepositoryId: link.id } },
    });
    await prisma.githubRepoSnapshot.deleteMany({
      where: { projectGithubRepositoryId: link.id },
    });

    let snapshotCount = 0;
    for (let index = 0; index < SEED_GITHUB_DEMO_SNAPSHOTS; index += 1) {
      const snapshot = await prisma.githubRepoSnapshot.create({
        data: {
          projectGithubRepositoryId: link.id,
          analysedByUserId: staffUser.id,
          analysedAt: new Date(Date.now() - index * 60 * 60 * 1000),
          data: {
            timeWindow: { from: "2026-03-01T00:00:00.000Z", to: "2026-03-29T23:59:59.000Z" },
            branches: [{ name: "main", commits: 14 }],
            contributors: [
              { login: "github-demo-student", commits: 9 },
              { login: "github-demo-staff", commits: 4 },
              { login: "guest-contributor", commits: 1 },
            ],
          },
        },
        select: { id: true },
      });

      await prisma.githubRepoSnapshotRepoStat.create({
        data: {
          snapshotId: snapshot.id,
          totalCommits: 14,
          totalAdditions: 820,
          totalDeletions: 210,
          totalContributors: 3,
          matchedContributors: 2,
          unmatchedContributors: 1,
          unmatchedCommits: 1,
          defaultBranchCommits: 14,
          commitsByDay: { "2026-03-28": 4, "2026-03-29": 10 },
          commitsByBranch: { main: 14 },
        },
      });

      await prisma.githubRepoSnapshotUserStat.createMany({
        data: [
          {
            snapshotId: snapshot.id,
            mappedUserId: studentUser.id,
            contributorKey: "github-demo-student",
            githubUserId: BigInt(910002),
            githubLogin: "github-demo-student",
            authorEmail: SEED_GITHUB_STUDENT_EMAIL,
            isMatched: true,
            commits: 9,
            additions: 520,
            deletions: 120,
            commitsByDay: { "2026-03-29": 9 },
            commitsByBranch: { main: 9 },
            firstCommitAt: new Date("2026-03-05T10:00:00.000Z"),
            lastCommitAt: new Date("2026-03-29T10:00:00.000Z"),
          },
          {
            snapshotId: snapshot.id,
            mappedUserId: staffUser.id,
            contributorKey: "github-demo-staff",
            githubUserId: BigInt(910001),
            githubLogin: staffAccount.login,
            authorEmail: SEED_GITHUB_STAFF_EMAIL,
            isMatched: true,
            commits: 4,
            additions: 250,
            deletions: 80,
            commitsByDay: { "2026-03-28": 4 },
            commitsByBranch: { main: 4 },
            firstCommitAt: new Date("2026-03-07T10:00:00.000Z"),
            lastCommitAt: new Date("2026-03-28T10:00:00.000Z"),
          },
          {
            snapshotId: snapshot.id,
            contributorKey: "guest-contributor",
            githubLogin: "guest-contributor",
            authorEmail: "guest@example.com",
            isMatched: false,
            commits: 1,
            additions: 50,
            deletions: 10,
            commitsByDay: { "2026-03-27": 1 },
            commitsByBranch: { main: 1 },
            firstCommitAt: new Date("2026-03-27T10:00:00.000Z"),
            lastCommitAt: new Date("2026-03-27T10:00:00.000Z"),
          },
        ],
      });

      snapshotCount += 1;
    }

    return {
      value: undefined,
      rows: 4 + snapshotCount * 5,
      details: `project=${project.id}, repository=${repository.id}, snapshots=${snapshotCount}`,
    };
  });
}
