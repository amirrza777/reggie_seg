import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "../../auth/middleware.js";
import { prisma } from "../../shared/db.js";
import { resolveEnterpriseUser } from "./middleware.js";
import {
  createModule,
  deleteModule,
  ensureCreatorLeader,
  getModuleAccess,
  getModuleAccessSelection,
  getModuleStudents,
  getOverview,
  listFeatureFlags,
  listAssignableUsers,
  listModules,
  parseAccessUserSearchFilters,
  parseModulePayload,
  parseModuleSearchFilters,
  parsePositiveInt,
  parsePositiveIntArray,
  searchAssignableUsers,
  searchModules,
  updateFeatureFlag,
  updateModule,
  updateModuleStudents,
  isEnterpriseAdminRole,
  getModuleMeetingSettings,
  updateModuleMeetingSettings,
} from "./service.js";
import type { EnterpriseRequest } from "./types.js";

const router = Router();

router.use(requireAuth);
router.use(resolveEnterpriseUser);

router.get("/overview", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });
  if (!isEnterpriseAdminRole(enterpriseUser.role)) return res.status(403).json({ error: "Forbidden" });

  return res.json(await getOverview(enterpriseUser));
});

router.get("/feature-flags", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });
  const result = await listFeatureFlags(enterpriseUser);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
});

router.patch("/feature-flags/:key", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const enabled = req.body?.enabled;
  if (typeof enabled !== "boolean") return res.status(400).json({ error: "enabled boolean required" });

  try {
    const result = await updateFeatureFlag(enterpriseUser, String(req.params.key), enabled);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.json(result.value);
  } catch (err) {
    console.error("update feature flag error", err);
    return res.status(500).json({ error: "Could not update feature flag" });
  }
});

router.get("/modules", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });
  return res.json(await listModules(enterpriseUser));
});

router.get("/modules/search", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const parsedFilters = parseModuleSearchFilters(req.query);
  if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });
  return res.json(await searchModules(enterpriseUser, parsedFilters.value));
});

router.get("/modules/access-users", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });
  return res.json(await listAssignableUsers(enterpriseUser));
});

router.get("/modules/access-users/search", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const parsedFilters = parseAccessUserSearchFilters(req.query);
  if (!parsedFilters.ok) return res.status(400).json({ error: parsedFilters.error });
  return res.json(await searchAssignableUsers(enterpriseUser, parsedFilters.value));
});

router.post("/modules", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });
  if (!isEnterpriseAdminRole(enterpriseUser.role)) {
    return res.status(403).json({ error: "Only enterprise admins can create modules" });
  }

  const payload = parseModulePayload(req.body);
  if (!payload.ok) return res.status(400).json({ error: payload.error });

  const leaderIds = payload.value.leaderIds;
  if (leaderIds.length === 0) {
    return res.status(400).json({ error: "At least one module leader is required" });
  }
  const result = await createModule(enterpriseUser, { ...payload.value, leaderIds });
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.status(201).json(result.value);
});

router.get("/modules/:moduleId/access", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const result = await getModuleAccess(enterpriseUser, moduleId);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
});

router.get("/modules/:moduleId/access-selection", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const result = await getModuleAccessSelection(enterpriseUser, moduleId);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
});

router.put("/modules/:moduleId", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const payload = parseModulePayload(req.body);
  if (!payload.ok) return res.status(400).json({ error: payload.error });
  const result = await updateModule(enterpriseUser, moduleId, payload.value);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
});

router.delete("/modules/:moduleId", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const result = await deleteModule(enterpriseUser, moduleId);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
});

router.get("/modules/:moduleId/students", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const result = await getModuleStudents(enterpriseUser, moduleId);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
});

router.get("/forum-reports", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });
  if (!isEnterpriseAdminRole(enterpriseUser.role)) return res.status(403).json({ error: "Forbidden" });

  const reports = await prisma.forumReport.findMany({
    where: {
      project: {
        module: {
          enterpriseId: enterpriseUser.enterpriseId,
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

  res.json(reports);
});

router.get("/forum-reports/:id/conversation", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });
  if (!isEnterpriseAdminRole(enterpriseUser.role)) return res.status(403).json({ error: "Forbidden" });

  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid report id" });

  const report = await prisma.forumReport.findFirst({
    where: {
      id,
      project: { module: { enterpriseId: enterpriseUser.enterpriseId } },
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

  if (!report) return res.status(404).json({ error: "Report not found" });

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

  const nodesById = new Map<number, any>();
  for (const post of posts) {
    nodesById.set(post.id, { ...post, replies: [] as any[] });
  }

  const childrenByParent = new Map<number | null, any[]>();
  for (const post of nodesById.values()) {
    const parentKey = post.parentPostId ?? null;
    const bucket = childrenByParent.get(parentKey) ?? [];
    bucket.push(post);
    childrenByParent.set(parentKey, bucket);
  }

  const sortReplies = (items: any[]) =>
    items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const buildTree = (node: any): any => {
    const children = childrenByParent.get(node.id) ?? [];
    sortReplies(children);
    node.replies = children.map(buildTree);
    return node;
  };

  const focus = nodesById.get(report.postId);
  if (!focus) {
    return res.json({
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
    });
  }

  let root = focus;
  while (root.parentPostId && nodesById.get(root.parentPostId)) {
    root = nodesById.get(root.parentPostId);
  }

  res.json({
    focusPostId: report.postId,
    thread: buildTree(root),
    missingPost: false,
  });
});

router.delete("/forum-reports/:id", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });
  if (!isEnterpriseAdminRole(enterpriseUser.role)) return res.status(403).json({ error: "Forbidden" });

  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid report id" });

  try {
    await prisma.$transaction(async (tx) => {
      const report = await tx.forumReport.findFirst({
        where: {
          id,
          project: { module: { enterpriseId: enterpriseUser.enterpriseId } },
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

      if (!report) {
        throw Object.assign(new Error("Report not found"), { code: "P2025" });
      }

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
    res.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Report not found" });
    console.error("delete forum report error", err);
    return res.status(500).json({ error: "Could not delete report" });
  }
});

router.delete("/forum-reports/:id/remove", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });
  if (!isEnterpriseAdminRole(enterpriseUser.role)) return res.status(403).json({ error: "Forbidden" });

  const id = parsePositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid report id" });

  try {
    await prisma.$transaction(async (tx) => {
      const report = await tx.forumReport.findFirst({
        where: {
          id,
          project: { module: { enterpriseId: enterpriseUser.enterpriseId } },
        },
        select: { id: true, postId: true, projectId: true },
      });

      if (!report) {
        throw Object.assign(new Error("Report not found"), { code: "P2025" });
      }

      await tx.discussionPost.deleteMany({
        where: { id: report.postId, projectId: report.projectId },
      });

      await tx.forumReport.delete({ where: { id: report.id } });
    });

    res.json({ ok: true });
  } catch (err: any) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Report not found" });
    console.error("remove forum report error", err);
    return res.status(500).json({ error: "Could not remove report" });
  }
});

router.put("/modules/:moduleId/students", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const parsedStudentIds = parsePositiveIntArray(req.body?.studentIds, "studentIds");
  if (!parsedStudentIds.ok) return res.status(400).json({ error: parsedStudentIds.error });
  const result = await updateModuleStudents(enterpriseUser, moduleId, parsedStudentIds.value);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
});

router.get("/modules/:moduleId/meeting-settings", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const result = await getModuleMeetingSettings(enterpriseUser, moduleId);
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
});

router.put("/modules/:moduleId/meeting-settings", async (req, res) => {
  const enterpriseUser = (req as EnterpriseRequest).enterpriseUser;
  if (!enterpriseUser) return res.status(500).json({ error: "Enterprise not resolved" });

  const moduleId = parsePositiveInt(req.params.moduleId);
  if (!moduleId) return res.status(400).json({ error: "Invalid module id" });

  const absenceThreshold = Number(req.body?.absenceThreshold);
  const minutesEditWindowDays = Number(req.body?.minutesEditWindowDays);
  if (!Number.isInteger(absenceThreshold) || absenceThreshold < 1) {
    return res.status(400).json({ error: "absenceThreshold must be a positive integer" });
  }
  if (!Number.isInteger(minutesEditWindowDays) || minutesEditWindowDays < 1) {
    return res.status(400).json({ error: "minutesEditWindowDays must be a positive integer" });
  }

  const result = await updateModuleMeetingSettings(enterpriseUser, moduleId, { absenceThreshold, minutesEditWindowDays });
  if (!result.ok) return res.status(result.status).json({ error: result.error });
  return res.json(result.value);
});

export default router;
