import { randParagraph, randSentence } from "@ngneat/falso";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedProject, SeedUser } from "./types";
import { SEED_FORUM_REACTIONS_PER_PROJECT, SEED_FORUM_STUDENT_REPORTS_PER_PROJECT } from "./volumes";

const ROOT_POSTS_PER_PROJECT = 3;

export async function seedForumPosts(projects: SeedProject[], staffUsers: SeedUser[], students: SeedUser[]) {
  return withSeedLogging("seedForumPosts", async () => {
    const validation = validateForumSeedInput(projects, staffUsers, students);
    if (!validation.ready) return validation.result;

    await resetProjectDiscussionPosts(projects);
    const rootPosts = buildRootPostRows(projects, staffUsers, students);
    const createdRoots = await createRootPosts(rootPosts);
    const replies = buildReplyRows(createdRoots, rootPosts, staffUsers, students);
    const createdReplies = await createReplyPosts(replies);
    const allPosts = buildAllCreatedPosts(createdRoots, rootPosts, createdReplies);

    const forumReactionRows = planForumReactionSeedData(allPosts, staffUsers, students);
    await createForumReactions(forumReactionRows);
    const forumStudentReportRows = planForumStudentReportSeedData(allPosts, staffUsers, students);
    await createForumStudentReports(forumStudentReportRows);

    return {
      value: undefined,
      rows: rootPosts.length + replies.length + forumReactionRows.length + forumStudentReportRows.length,
      details: `projects seeded=${projects.length}; reactions=${forumReactionRows.length}; reports=${forumStudentReportRows.length}`,
    };
  });
}

export function planForumReactionSeedData(
  posts: { id: number; projectId: number; authorId: number }[],
  staffUsers: SeedUser[],
  students: SeedUser[],
) {
  const projectIds = Array.from(new Set(posts.map((post) => post.projectId)));

  return projectIds.flatMap((projectId, projectIndex) => {
    const projectPosts = posts.filter((post) => post.projectId === projectId);
    return Array.from({ length: Math.min(SEED_FORUM_REACTIONS_PER_PROJECT, projectPosts.length) }, (_, reactionIndex) => {
      const post = projectPosts[reactionIndex % projectPosts.length];
      const preferredUsers =
        reactionIndex % 3 === 0 ? staffUsers : students;
      const candidatePool = preferredUsers.concat(reactionIndex % 3 === 0 ? students : staffUsers);
      const reactor = candidatePool.find((user) => user.id !== post?.authorId);
      if (!post || !reactor) return null;

      return {
        postId: post.id,
        userId: reactor.id,
        type: reactionIndex === SEED_FORUM_REACTIONS_PER_PROJECT - 1 && projectIndex % 2 === 1 ? "DISLIKE" as const : "LIKE" as const,
      };
    }).filter((row): row is NonNullable<typeof row> => row !== null);
  });
}

export function planForumStudentReportSeedData(
  posts: { id: number; projectId: number; authorId: number }[],
  staffUsers: SeedUser[],
  students: SeedUser[],
) {
  const projectIds = Array.from(new Set(posts.map((post) => post.projectId)));
  const studentIdSet = new Set(students.map((student) => student.id));

  return projectIds.flatMap((projectId, projectIndex) => {
    const projectPosts = posts.filter((post) => post.projectId === projectId && studentIdSet.has(post.authorId));
    return Array.from({ length: Math.min(SEED_FORUM_STUDENT_REPORTS_PER_PROJECT, projectPosts.length) }, (_, reportIndex) => {
      const post = projectPosts[reportIndex % projectPosts.length];
      const reporter = students.find((student) => student.id !== post?.authorId);
      if (!post || !reporter) return null;

      const reviewed = reportIndex === 1 && staffUsers.length > 0;
      return {
        projectId,
        postId: post.id,
        reporterId: reporter.id,
        status: reviewed ? ("APPROVED" as const) : ("PENDING" as const),
        reason: normalizeSentence(randSentence({ length: { min: 6, max: 12 } })),
        reviewedAt: reviewed ? new Date(Date.now() - (projectIndex + 1) * 60 * 60 * 1000) : null,
        reviewedById: reviewed ? staffUsers[projectIndex % staffUsers.length].id : null,
      };
    }).filter((row): row is NonNullable<typeof row> => row !== null);
  });
}

function buildForumTitle(isStaffAuthored: boolean, projectIndex: number, postIndex: number) {
  if (isStaffAuthored) {
    return `Staff check-in ${projectIndex + 1}: ${normalizeSentence(randSentence({ length: { min: 3, max: 6 } }))}`;
  }

  return `Student topic ${postIndex + 1}: ${normalizeSentence(randSentence({ length: { min: 4, max: 7 } }))}`;
}

function buildForumBody(isStaffAuthored: boolean) {
  const generated = randParagraph({ length: { min: 2, max: 4 } });
  const body = Array.isArray(generated) ? generated.join("\n\n") : generated;
  return isStaffAuthored ? `Staff guidance:\n\n${body}` : body;
}

function buildForumReplyBody(isReplyFromStaff: boolean) {
  const generated = randParagraph({ length: { min: 1, max: 2 } });
  const body = Array.isArray(generated) ? generated.join("\n\n") : generated;
  return isReplyFromStaff ? `Staff reply:\n\n${body}` : body;
}

function normalizeSentence(value: string | string[]) {
  const sentence = Array.isArray(value) ? value.join(" ") : value;
  return sentence.replace(/\s+/g, " ").trim().replace(/[.?!]+$/, "");
}

function validateForumSeedInput(projects: SeedProject[], staffUsers: SeedUser[], students: SeedUser[]) {
  if (projects.length === 0) {
    return { ready: false as const, result: { value: undefined, rows: 0, details: "skipped (no projects)" } };
  }
  if (staffUsers.length === 0 || students.length === 0) {
    return {
      ready: false as const,
      result: { value: undefined, rows: 0, details: "skipped (missing staff/student authors)" },
    };
  }
  return { ready: true as const };
}

function resetProjectDiscussionPosts(projects: SeedProject[]) {
  return prisma.discussionPost.deleteMany({
    where: { projectId: { in: projects.map((project) => project.id) } },
  });
}

function buildRootPostRows(projects: SeedProject[], staffUsers: SeedUser[], students: SeedUser[]) {
  return projects.flatMap((project, projectIndex) =>
    Array.from({ length: ROOT_POSTS_PER_PROJECT }, (_, postIndex) => {
      const staffAuthor = staffUsers[(projectIndex + postIndex) % staffUsers.length];
      const studentAuthor = students[(projectIndex + postIndex) % students.length];
      const isStaffAuthored = postIndex === 0;
      return {
        projectId: project.id,
        authorId: (isStaffAuthored ? staffAuthor : studentAuthor).id,
        title: buildForumTitle(isStaffAuthored, projectIndex, postIndex),
        body: buildForumBody(isStaffAuthored),
      };
    })
  );
}

function createRootPosts(rootPosts: ReturnType<typeof buildRootPostRows>) {
  return prisma.$transaction(
    rootPosts.map((post) =>
      prisma.discussionPost.create({
        data: post,
        select: { id: true, projectId: true },
      })
    )
  );
}

function buildReplyRows(
  createdRoots: Awaited<ReturnType<typeof createRootPosts>>,
  rootPosts: ReturnType<typeof buildRootPostRows>,
  staffUsers: SeedUser[],
  students: SeedUser[]
) {
  return createdRoots.map((post, index) => {
    const staffAuthor = staffUsers[index % staffUsers.length];
    const studentAuthor = students[index % students.length];
    const isReplyFromStaff = index % 2 === 0;
    return {
      projectId: post.projectId,
      parentPostId: post.id,
      authorId: (isReplyFromStaff ? staffAuthor : studentAuthor).id,
      title: `Re: ${rootPosts[index]?.title ?? "Discussion thread"}`,
      body: buildForumReplyBody(isReplyFromStaff),
    };
  });
}

function createReplyPosts(replies: ReturnType<typeof buildReplyRows>) {
  return prisma.$transaction(
    replies.map((reply) =>
      prisma.discussionPost.create({
        data: reply,
        select: { id: true, projectId: true, authorId: true },
      })
    )
  );
}

function buildAllCreatedPosts(
  createdRoots: Awaited<ReturnType<typeof createRootPosts>>,
  rootPosts: ReturnType<typeof buildRootPostRows>,
  createdReplies: Awaited<ReturnType<typeof createReplyPosts>>
) {
  return [
    ...createdRoots.map((post, index) => ({
      id: post.id,
      projectId: post.projectId,
      authorId: rootPosts[index]?.authorId ?? 0,
    })),
    ...createdReplies,
  ];
}

function createForumReactions(rows: ReturnType<typeof planForumReactionSeedData>) {
  if (rows.length === 0) return Promise.resolve();
  return prisma.forumReaction.createMany({ data: rows, skipDuplicates: true });
}

function createForumStudentReports(rows: ReturnType<typeof planForumStudentReportSeedData>) {
  if (rows.length === 0) return Promise.resolve();
  return prisma.forumStudentReport.createMany({ data: rows, skipDuplicates: true });
}
