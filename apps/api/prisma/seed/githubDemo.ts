import { createCipheriv, randomBytes } from "crypto";
import { SEED_GITHUB_STAFF_EMAIL, SEED_GITHUB_STUDENT_EMAIL } from "./config";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedContext } from "./types";
import { SEED_GITHUB_DEMO_SNAPSHOTS } from "./volumes";

export async function seedGithubDemoPath(context: SeedContext) {
  return withSeedLogging("seedGithubDemoPath", async () => {
    const project = context.projects[0];
    if (!project) return { value: undefined, rows: 0, details: "skipped (no project available)" };

    const users = await findGithubDemoUsers(context.enterprise.id);
    if (!users) return { value: undefined, rows: 0, details: "skipped (missing GitHub demo users)" };

    const staffAccount = await upsertGithubStaffAccount(users.staffUser.id);
    await upsertGithubStudentAccount(users.studentUser.id);
    const repository = await upsertGithubDemoRepository();
    const link = await upsertGithubRepositoryLink(project.id, repository.id, users.staffUser.id);

    await clearSnapshotsForProjectRepoLink(link.id);
    const snapshotCount = await seedDemoSnapshots(link.id, users.staffUser.id, users.studentUser.id, staffAccount.login);

    return {
      value: undefined,
      rows: 4 + snapshotCount * 5,
      details: `project=${project.id}, repository=${repository.id}, snapshots=${snapshotCount}`,
    };
  });
}

type GithubDemoUsers = {
  staffUser: { id: number };
  studentUser: { id: number };
};

async function findGithubDemoUsers(enterpriseId: string): Promise<GithubDemoUsers | null> {
  const [staffUser, studentUser] = await Promise.all([
    prisma.user.findUnique({
      where: { enterpriseId_email: { enterpriseId, email: SEED_GITHUB_STAFF_EMAIL } },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { enterpriseId_email: { enterpriseId, email: SEED_GITHUB_STUDENT_EMAIL } },
      select: { id: true },
    }),
  ]);
  if (!staffUser || !studentUser) return null;
  return { staffUser, studentUser };
}

function upsertGithubStaffAccount(userId: number) {
  return prisma.githubAccount.upsert({
    where: { userId },
    update: buildGithubAccountWrite("staff"),
    create: { userId, ...buildGithubAccountWrite("staff") },
    select: { id: true, login: true },
  });
}

function upsertGithubStudentAccount(userId: number) {
  return prisma.githubAccount.upsert({
    where: { userId },
    update: buildGithubAccountWrite("student"),
    create: { userId, ...buildGithubAccountWrite("student") },
    select: { id: true },
  });
}

function buildGithubAccountWrite(kind: "staff" | "student") {
  if (kind === "staff") {
    return {
      githubUserId: BigInt(910001),
      login: "github-demo-staff",
      email: SEED_GITHUB_STAFF_EMAIL,
      accessTokenEncrypted: encryptSeedGithubToken("seed-access-token-staff"),
      scopes: "repo,read:user",
    };
  }
  return {
    githubUserId: BigInt(910002),
    login: "github-demo-student",
    email: SEED_GITHUB_STUDENT_EMAIL,
    accessTokenEncrypted: encryptSeedGithubToken("seed-access-token-student"),
    scopes: "repo,read:user",
  };
}

function getSeedGithubTokenEncryptionKey() {
  const raw = process.env.GITHUB_TOKEN_ENCRYPTION_KEY || "";
  if (!raw) {
    throw new Error("GITHUB_TOKEN_ENCRYPTION_KEY must be configured for GitHub demo seeding");
  }

  if (/^[a-f0-9]{64}$/i.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  const base64 = Buffer.from(raw, "base64");
  if (base64.length === 32) {
    return base64;
  }

  const utf8 = Buffer.from(raw, "utf8");
  if (utf8.length === 32) {
    return utf8;
  }

  throw new Error("GITHUB_TOKEN_ENCRYPTION_KEY must decode to 32 bytes for GitHub demo seeding");
}

function encryptSeedGithubToken(plainToken: string) {
  const key = getSeedGithubTokenEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainToken, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${encrypted.toString("base64")}.${authTag.toString("base64")}`;
}

function upsertGithubDemoRepository() {
  const now = new Date();
  return prisma.githubRepository.upsert({
    where: { fullName: "reggie-seed/demo-project" },
    update: buildRepositoryWrite(now),
    create: buildRepositoryCreate(now),
    select: { id: true },
  });
}

function buildRepositoryWrite(pushedAt: Date) {
  return {
    githubRepoId: BigInt(920001),
    ownerLogin: "reggie-seed",
    ownerType: "Organization",
    name: "demo-project",
    htmlUrl: "https://github.com/reggie-seed/demo-project",
    isPrivate: false,
    isArchived: false,
    defaultBranch: "main",
    description: "Seeded demo repository for GitHub analytics flows.",
    pushedAt,
  };
}

function buildRepositoryCreate(pushedAt: Date) {
  return {
    ...buildRepositoryWrite(pushedAt),
    fullName: "reggie-seed/demo-project",
  };
}

function upsertGithubRepositoryLink(projectId: number, githubRepositoryId: number, linkedByUserId: number) {
  const now = new Date();
  return prisma.projectGithubRepository.upsert({
    where: { projectId_githubRepositoryId: { projectId, githubRepositoryId } },
    update: buildRepositoryLinkWrite(linkedByUserId, now),
    create: {
      projectId,
      githubRepositoryId,
      ...buildRepositoryLinkWrite(linkedByUserId, now),
    },
    select: { id: true },
  });
}

function buildRepositoryLinkWrite(linkedByUserId: number, now: Date) {
  return {
    linkedByUserId,
    isActive: true,
    autoSyncEnabled: true,
    syncIntervalMinutes: 60,
    lastSyncedAt: now,
    nextSyncAt: new Date(now.getTime() + 60 * 60 * 1000),
  };
}

async function clearSnapshotsForProjectRepoLink(projectGithubRepositoryId: number) {
  await prisma.githubRepoSnapshotUserStat.deleteMany({
    where: { snapshot: { projectGithubRepositoryId } },
  });
  await prisma.githubRepoSnapshotRepoStat.deleteMany({
    where: { snapshot: { projectGithubRepositoryId } },
  });
  await prisma.githubRepoSnapshot.deleteMany({ where: { projectGithubRepositoryId } });
}

async function seedDemoSnapshots(
  projectGithubRepositoryId: number,
  staffUserId: number,
  studentUserId: number,
  staffLogin: string
) {
  let snapshotCount = 0;
  for (let index = 0; index < SEED_GITHUB_DEMO_SNAPSHOTS; index += 1) {
    const snapshot = await createGithubDemoSnapshot(projectGithubRepositoryId, staffUserId, index);
    await prisma.githubRepoSnapshotRepoStat.create({ data: buildRepoStat(snapshot.id) });
    await prisma.githubRepoSnapshotUserStat.createMany({
      data: buildUserStats(snapshot.id, studentUserId, staffUserId, staffLogin),
    });
    snapshotCount += 1;
  }
  return snapshotCount;
}

function createGithubDemoSnapshot(projectGithubRepositoryId: number, analysedByUserId: number, index: number) {
  return prisma.githubRepoSnapshot.create({
    data: {
      projectGithubRepositoryId,
      analysedByUserId,
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
}

function buildRepoStat(snapshotId: number) {
  return {
    snapshotId,
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
  };
}

function buildUserStats(snapshotId: number, studentUserId: number, staffUserId: number, staffLogin: string) {
  return [
    buildStudentUserStat(snapshotId, studentUserId),
    buildStaffUserStat(snapshotId, staffUserId, staffLogin),
    buildGuestUserStat(snapshotId),
  ];
}

export const __githubDemoInternals = {
  getSeedGithubTokenEncryptionKey,
};

function buildStudentUserStat(snapshotId: number, studentUserId: number) {
  return {
    snapshotId,
    mappedUserId: studentUserId,
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
  };
}

function buildStaffUserStat(snapshotId: number, staffUserId: number, staffLogin: string) {
  return {
    snapshotId,
    mappedUserId: staffUserId,
    contributorKey: "github-demo-staff",
    githubUserId: BigInt(910001),
    githubLogin: staffLogin,
    authorEmail: SEED_GITHUB_STAFF_EMAIL,
    isMatched: true,
    commits: 4,
    additions: 250,
    deletions: 80,
    commitsByDay: { "2026-03-28": 4 },
    commitsByBranch: { main: 4 },
    firstCommitAt: new Date("2026-03-07T10:00:00.000Z"),
    lastCommitAt: new Date("2026-03-28T10:00:00.000Z"),
  };
}

function buildGuestUserStat(snapshotId: number) {
  return {
    snapshotId,
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
  };
}
