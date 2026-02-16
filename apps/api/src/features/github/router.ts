import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import {
  disconnectGithubAccountHandler,
  getGithubConnectionStatusHandler,
  getLatestProjectGithubRepoSnapshotHandler,
  getGithubSnapshotHandler,
  getGithubOAuthConnectUrlHandler,
  getProjectGithubMappingCoverageHandler,
  githubOAuthCallbackHandler,
  linkGithubProjectRepoHandler,
  removeGithubProjectRepoHandler,
  listProjectGithubRepoSnapshotsHandler,
  listProjectGithubReposHandler,
  listGithubReposHandler,
  updateProjectGithubSyncSettingsHandler,
} from "./controller.js";

const router = Router();

router.get("/oauth/connect", requireAuth, getGithubOAuthConnectUrlHandler);
router.get("/oauth/callback", githubOAuthCallbackHandler);
router.get("/me", requireAuth, getGithubConnectionStatusHandler);
router.delete("/me", requireAuth, disconnectGithubAccountHandler);
router.get("/repos", requireAuth, listGithubReposHandler);
router.post("/project-repos", requireAuth, linkGithubProjectRepoHandler);
router.delete("/project-repos/:linkId", requireAuth, removeGithubProjectRepoHandler);
router.get("/project-repos", requireAuth, listProjectGithubReposHandler);
router.get("/project-repos/:linkId/snapshots", requireAuth, listProjectGithubRepoSnapshotsHandler);
router.get("/project-repos/:linkId/latest-snapshot", requireAuth, getLatestProjectGithubRepoSnapshotHandler);
router.get("/project-repos/:linkId/mapping-coverage", requireAuth, getProjectGithubMappingCoverageHandler);
router.patch("/project-repos/:linkId/sync-settings", requireAuth, updateProjectGithubSyncSettingsHandler);
router.get("/snapshots/:snapshotId", requireAuth, getGithubSnapshotHandler);

export default router;
