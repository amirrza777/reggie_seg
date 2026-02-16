import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import {
  analyseProjectGithubRepoHandler,
  disconnectGithubAccountHandler,
  getGithubConnectionStatusHandler,
  getGithubSnapshotHandler,
  getGithubOAuthConnectUrlHandler,
  getProjectGithubMappingCoverageHandler,
  githubOAuthCallbackHandler,
  linkGithubProjectRepoHandler,
  listProjectGithubRepoSnapshotsHandler,
  listProjectGithubReposHandler,
  listGithubReposHandler,
} from "./controller.js";

const router = Router();

router.get("/oauth/connect", requireAuth, getGithubOAuthConnectUrlHandler);
router.get("/oauth/callback", githubOAuthCallbackHandler);
router.get("/me", requireAuth, getGithubConnectionStatusHandler);
router.delete("/me", requireAuth, disconnectGithubAccountHandler);
router.get("/repos", requireAuth, listGithubReposHandler);
router.post("/project-repos", requireAuth, linkGithubProjectRepoHandler);
router.get("/project-repos", requireAuth, listProjectGithubReposHandler);
router.post("/project-repos/:linkId/analyse", requireAuth, analyseProjectGithubRepoHandler);
router.get("/project-repos/:linkId/snapshots", requireAuth, listProjectGithubRepoSnapshotsHandler);
router.get("/project-repos/:linkId/mapping-coverage", requireAuth, getProjectGithubMappingCoverageHandler);
router.get("/snapshots/:snapshotId", requireAuth, getGithubSnapshotHandler);

export default router;
