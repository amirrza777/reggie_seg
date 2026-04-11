import { Router } from "express";
import {
  auditLogsStreamHandler,
  createEnterpriseHandler,
  deleteEnterpriseHandler,
  getSummaryHandler,
  inviteCurrentEnterpriseAdminHandler,
  inviteEnterpriseAdminHandler,
  inviteGlobalAdminHandler,
  listAuditLogsHandler,
  listEnterpriseUsersHandler,
  listEnterprisesHandler,
  listUsersHandler,
  searchEnterpriseUsersHandler,
  searchEnterprisesHandler,
  searchUsersHandler,
  updateEnterpriseUserHandler,
  updateUserHandler,
  updateUserRoleHandler,
} from "./controller.js";
import { ensureAdmin, ensureSuperAdmin } from "./middleware.js";
import { rateLimit } from "../../shared/rateLimit.js";

const auditLogLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, prefix: "admin:audit-logs" });

const router = Router();

router.use(ensureAdmin);

router.use("/enterprises", ensureSuperAdmin);
router.get("/summary", getSummaryHandler);
router.post("/invites/enterprise-admin", inviteCurrentEnterpriseAdminHandler);
router.post("/invites/global-admin", ensureSuperAdmin, inviteGlobalAdminHandler);
router.get("/users", listUsersHandler);
router.get("/users/search", searchUsersHandler);
router.patch("/users/:id/role", updateUserRoleHandler);
router.patch("/users/:id", updateUserHandler);
router.get("/enterprises", listEnterprisesHandler);
router.get("/enterprises/search", searchEnterprisesHandler);
router.post("/enterprises", createEnterpriseHandler);
router.get("/enterprises/:enterpriseId/users", listEnterpriseUsersHandler);
router.get("/enterprises/:enterpriseId/users/search", searchEnterpriseUsersHandler);
router.patch("/enterprises/:enterpriseId/users/:id", updateEnterpriseUserHandler);
router.post("/enterprises/:enterpriseId/invites/enterprise-admin", inviteEnterpriseAdminHandler);
router.delete("/enterprises/:enterpriseId", deleteEnterpriseHandler);
router.get("/audit-logs/stream", auditLogsStreamHandler);
router.get("/audit-logs", auditLogLimiter, listAuditLogsHandler);

export default router;
