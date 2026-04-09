import { prisma } from "../../shared/db.js";

type EnterpriseScope = {
  enterpriseId: string;
};

type ThreadNode = {
  id: number;
  parentPostId: number | null;
  title: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
  };
  replies: ThreadNode[];
};

export async function listForumReportsForEnterprise(scope: EnterpriseScope) {
  return prisma.forumReport.findMany({
    where: {
      project: {
        module: {
          enterpriseId: scope.enterpriseId,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      postId: true,
      createdAt: true,
      reason: true,
      title: true,
      body: true,
      project: {
        select: {
          id: true,
          name: true,
          module: { select: { name: true } },
        },
      },
      reporter: {
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      },
      author: {
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      },
    },
  });
}

export async function getForumReportConversationForEnterprise(scope: EnterpriseScope, reportId: number) {
  const report = await prisma.forumReport.findFirst({
    where: {
      id: reportId,
      project: { module: { enterpriseId: scope.enterpriseId } },
    },
    select: {
      id: true,
      postId: true,
      projectId: true,
      title: true,
      body: true,
      postCreatedAt: true,
      postUpdatedAt: true,
      author: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
    },
  });
  if (!report) {
    return { ok: false as const, status: 404, error: "Report not found" };
  }

  const posts = await prisma.discussionPost.findMany({
    where: { projectId: report.projectId },
    select: {
      id: true,
      parentPostId: true,
      title: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
    },
  });

  const nodesById = new Map<number, ThreadNode>();
  for (const post of posts) {
    nodesById.set(post.id, { ...post, replies: [] });
  }

  const childrenByParent = new Map<number | null, ThreadNode[]>();
  for (const post of nodesById.values()) {
    const parentKey = post.parentPostId ?? null;
    const bucket = childrenByParent.get(parentKey) ?? [];
    bucket.push(post);
    childrenByParent.set(parentKey, bucket);
  }

  const focus = nodesById.get(report.postId);
  if (!focus) {
    return {
      ok: true as const,
      value: {
        focusPostId: report.postId,
        thread: {
          id: report.postId,
          parentPostId: null,
          title: report.title,
          body: report.body,
          createdAt: report.postCreatedAt,
          updatedAt: report.postUpdatedAt,
          author: report.author,
          replies: [],
        },
        missingPost: true,
      },
    };
  }

  let root = focus;
  while (root.parentPostId && nodesById.get(root.parentPostId)) {
    root = nodesById.get(root.parentPostId)!;
  }

  return {
    ok: true as const,
    value: {
      focusPostId: report.postId,
      thread: buildThreadTree(root, childrenByParent),
      missingPost: false,
    },
  };
}

function buildThreadTree(node: ThreadNode, childrenByParent: Map<number | null, ThreadNode[]>): ThreadNode {
  const children = childrenByParent.get(node.id) ?? [];
  children.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return {
    ...node,
    replies: children.map((child) => buildThreadTree(child, childrenByParent)),
  };
}

export async function dismissForumReportForEnterprise(scope: EnterpriseScope, reportId: number) {
  try {
    await prisma.$transaction(async (tx) => {
      const report = await tx.forumReport.findFirst({
        where: {
          id: reportId,
          project: { module: { enterpriseId: scope.enterpriseId } },
        },
        select: {
          id: true,
          projectId: true,
          postId: true,
          parentPostId: true,
          authorId: true,
          title: true,
          body: true,
          postCreatedAt: true,
          postUpdatedAt: true,
        },
      });
      if (!report) throw Object.assign(new Error("Report not found"), { code: "P2025" });

      const existing = await tx.discussionPost.findFirst({
        where: { id: report.postId, projectId: report.projectId },
        select: { id: true },
      });
      const parent =
        report.parentPostId === null
          ? null
          : await tx.discussionPost.findFirst({
              where: { id: report.parentPostId, projectId: report.projectId },
              select: { id: true },
            });
      if (!existing) {
        await tx.discussionPost.create({
          data: {
            projectId: report.projectId,
            authorId: report.authorId,
            title: report.title,
            body: report.body,
            createdAt: report.postCreatedAt,
            updatedAt: report.postUpdatedAt,
            parentPostId: parent ? report.parentPostId : null,
          },
        });
      }
      await tx.forumReport.delete({ where: { id: report.id } });
    });
    return { ok: true as const, value: { ok: true } };
  } catch (error: any) {
    if (error?.code === "P2025") return { ok: false as const, status: 404, error: "Report not found" };
    console.error("delete forum report error", error);
    return { ok: false as const, status: 500, error: "Could not delete report" };
  }
}

export async function removeForumReportForEnterprise(scope: EnterpriseScope, reportId: number) {
  try {
    await prisma.$transaction(async (tx) => {
      const report = await tx.forumReport.findFirst({
        where: {
          id: reportId,
          project: { module: { enterpriseId: scope.enterpriseId } },
        },
        select: { id: true, postId: true, projectId: true },
      });
      if (!report) throw Object.assign(new Error("Report not found"), { code: "P2025" });

      await tx.discussionPost.deleteMany({
        where: { id: report.postId, projectId: report.projectId },
      });
      await tx.forumReport.delete({ where: { id: report.id } });
    });
    return { ok: true as const, value: { ok: true } };
  } catch (error: any) {
    if (error?.code === "P2025") return { ok: false as const, status: 404, error: "Report not found" };
    console.error("remove forum report error", error);
    return { ok: false as const, status: 500, error: "Could not remove report" };
  }
}
