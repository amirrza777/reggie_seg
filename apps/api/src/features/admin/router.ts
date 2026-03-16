import { Router } from "express";
import {
  createEnterpriseHandler,
  deleteEnterpriseHandler,
  getSummaryHandler,
  listAuditLogsHandler,
  listEnterpriseUsersHandler,
  listEnterprisesHandler,
  listFeatureFlagsHandler,
  listUsersHandler,
  searchEnterpriseUsersHandler,
  searchEnterprisesHandler,
  searchUsersHandler,
  updateEnterpriseUserHandler,
  updateFeatureFlagHandler,
  updateUserHandler,
  updateUserRoleHandler,
} from "./controller.js";
import { ensureAdmin, ensureSuperAdmin } from "./middleware.js";

const router = Router();

router.use(ensureAdmin);

router.use("/enterprises", ensureSuperAdmin);
router.get("/summary", getSummaryHandler);
router.get("/users", listUsersHandler);
router.get("/users/search", searchUsersHandler);
router.patch("/users/:id/role", updateUserRoleHandler);
router.patch("/users/:id", updateUserHandler);
router.get("/feature-flags", listFeatureFlagsHandler);
router.patch("/feature-flags/:key", updateFeatureFlagHandler);
router.get("/enterprises", listEnterprisesHandler);
router.get("/enterprises/search", searchEnterprisesHandler);
router.post("/enterprises", createEnterpriseHandler);
router.get("/enterprises/:enterpriseId/users", listEnterpriseUsersHandler);
router.get("/enterprises/:enterpriseId/users/search", searchEnterpriseUsersHandler);
router.patch("/enterprises/:enterpriseId/users/:id", updateEnterpriseUserHandler);
router.delete("/enterprises/:enterpriseId", deleteEnterpriseHandler);
router.get("/audit-logs", listAuditLogsHandler);

export default router;
