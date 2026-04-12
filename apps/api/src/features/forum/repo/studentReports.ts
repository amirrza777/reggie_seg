import { prisma } from "../../../shared/db.js";
import { canManageForumSettings, getUserRole, isUserInProject } from "./access.js";

type StudentReportResult =
  | { status: "ok" }
  | { status: "forbidden" }
  | { status: "not_found" }
  | { status: "duplicate" }
  | { status: "already_reported" };

async function validateStudentReportCreationAccess(userId: number, projectId: number) {
  const hasAccess = await isUserInProject(userId, projectId);
  if (!hasAccess) return { valid: false };
  const role = await getUserRole(userId);
  if (role !== "STUDENT") return { valid: false };
  return { valid: true };
}

async function checkExistingReports(postId: number, projectId: number, userId: number) {
  const [post, staffReport, studentReport] = await Promise.all([
    prisma.discussionPost.findFirst({ where: { id: postId, projectId }, select: { id: true } }),
    prisma.forumReport.findFirst({ where: { postId, projectId }, select: { id: true } }),
    prisma.forumStudentReport.findFirst({ where: { postId, reporterId: userId }, select: { id: true, status: true } }),
  ]);
  return { post, staffReport, studentReport };
}

async function upsertStudentReport(postId: number, projectId: number, userId: number, reason: string | null, existingStudentReport: any) {
  if (existingStudentReport?.status === "IGNORED") {
    await prisma.forumStudentReport.update({
      where: { id: existingStudentReport.id },
      data: { status: "PENDING", reason: reason?.trim() || null, reviewedAt: null, reviewedById: null, createdAt: new Date() },
    });
  } else {
    await prisma.forumStudentReport.create({
      data: { projectId, postId, reporterId: userId, reason: reason?.trim() || null },
    });
  }
}

export async function createStudentReport(
  userId: number,
  projectId: number,
  postId: number,
  reason?: string | null
): Promise<StudentReportResult> {
  const accessCheck = await validateStudentReportCreationAccess(userId, projectId);
  if (!accessCheck.valid) return { status: "forbidden" };

  const { post, staffReport, studentReport } = await checkExistingReports(postId, projectId, userId);
  if (!post) return { status: "not_found" };
  if (staffReport) return { status: "already_reported" };
  if (studentReport && studentReport.status !== "IGNORED") return { status: "duplicate" };

  await upsertStudentReport(postId, projectId, userId, reason, studentReport);
  return { status: "ok" };
}

type StudentReportEntry = {
  id: number;
  createdAt: Date;
  reason: string | null;
  post: {
    id: number;
    title: string;
    body: string;
    createdAt: Date;
    author: { id: number; firstName: string; lastName: string; role: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN" };
  };
  reporter: { id: number; firstName: string; lastName: string; email: string; role: "STUDENT" | "STAFF" | "ENTERPRISE_ADMIN" | "ADMIN" };
};

export async function getStudentReportsForProject(userId: number, projectId: number): Promise<StudentReportEntry[] | null> {
  const canManage = await canManageForumSettings(userId, projectId);
  if (!canManage) return null;

  const [reports, counts] = await Promise.all([
    prisma.forumStudentReport.findMany({
      where: { projectId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        reason: true,
        reporter: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        post: {
          select: {
            id: true,
            title: true,
            body: true,
            createdAt: true,
            author: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    }),
    prisma.forumStudentReport.groupBy({
      by: ["postId"],
      where: { projectId, status: "PENDING" },
      _count: { _all: true },
    }),
  ]);

  const countByPostId = new Map<number, number>();
  for (const entry of counts) {
    countByPostId.set(entry.postId, entry._count._all);
  }

  return reports.map((report) => ({
    ...report,
    reportCount: countByPostId.get(report.post.id) ?? 1,
  }));
}

type StudentReportModerationResult =
  | { status: "ok" }
  | { status: "forbidden" }
  | { status: "not_found" };

async function fetchReportAndPost(reportId: number, projectId: number) {
  const report = await prisma.forumStudentReport.findFirst({
    where: { id: reportId, projectId, status: "PENDING" },
    select: { id: true, postId: true },
  });
  if (!report) return { report: null, post: null };
  const post = await prisma.discussionPost.findFirst({
    where: { id: report.postId, projectId },
    select: { id: true, authorId: true, title: true, body: true, createdAt: true, updatedAt: true, parentPostId: true },
  });
  return { report, post };
}

async function createStaffReportAndApproveStudent(tx: any, userId: number, projectId: number, reportId: number, post: any) {
  const existingStaffReport = await tx.forumReport.findFirst({
    where: { postId: post.id, projectId },
    select: { id: true },
  });
  if (!existingStaffReport) {
    await tx.forumReport.create({
      data: {
        projectId,
        postId: post.id,
        reporterId: userId,
        authorId: post.authorId,
        parentPostId: post.parentPostId,
        reason: null,
        title: post.title,
        body: post.body,
        postCreatedAt: post.createdAt,
        postUpdatedAt: post.updatedAt,
      },
    });
  }
  await tx.forumStudentReport.update({
    where: { id: reportId },
    data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: userId },
  });
}

export async function approveStudentReport(
  userId: number,
  projectId: number,
  reportId: number
): Promise<StudentReportModerationResult> {
  const canManage = await canManageForumSettings(userId, projectId);
  if (!canManage) return { status: "forbidden" };

  const { report, post } = await fetchReportAndPost(reportId, projectId);
  if (!report || !post) return { status: "not_found" };

  await prisma.$transaction((tx) => createStaffReportAndApproveStudent(tx, userId, projectId, report.id, post));
  return { status: "ok" };
}

export async function ignoreStudentReport(
  userId: number,
  projectId: number,
  reportId: number
): Promise<StudentReportModerationResult> {
  const canManage = await canManageForumSettings(userId, projectId);
  if (!canManage) return { status: "forbidden" };

  const report = await prisma.forumStudentReport.findFirst({
    where: { id: reportId, projectId, status: "PENDING" },
    select: { id: true },
  });
  if (!report) return { status: "not_found" };

  await prisma.forumStudentReport.update({
    where: { id: report.id },
    data: { status: "IGNORED", reviewedAt: new Date(), reviewedById: userId },
  });

  return { status: "ok" };
}
