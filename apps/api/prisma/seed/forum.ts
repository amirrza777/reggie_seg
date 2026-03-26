import { randParagraph, randSentence } from "@ngneat/falso";
import { withSeedLogging } from "./logging";
import { prisma } from "./prismaClient";
import type { SeedProject, SeedUser } from "./types";

const ROOT_POSTS_PER_PROJECT = 3;

export async function seedForumPosts(projects: SeedProject[], staffUsers: SeedUser[], students: SeedUser[]) {
  return withSeedLogging("seedForumPosts", async () => {
    if (projects.length === 0) {
      return { value: undefined, rows: 0, details: "skipped (no projects)" };
    }

    if (staffUsers.length === 0 || students.length === 0) {
      return { value: undefined, rows: 0, details: "skipped (missing staff/student authors)" };
    }

    await prisma.discussionPost.deleteMany({
      where: { projectId: { in: projects.map((project) => project.id) } },
    });

    const rootPosts = projects.flatMap((project, projectIndex) =>
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
      }),
    );

    const createdRoots = await prisma.$transaction(
      rootPosts.map((post) =>
        prisma.discussionPost.create({
          data: post,
          select: { id: true, projectId: true },
        }),
      ),
    );

    const replies = createdRoots.map((post, index) => {
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

    await prisma.discussionPost.createMany({ data: replies });

    return {
      value: undefined,
      rows: rootPosts.length + replies.length,
      details: `projects seeded=${projects.length}; staff/student discussion threads generated`,
    };
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
