import { Router } from "express";
import {
  getPeerFeedbacksHandler,
  getPeerFeedbackHandler,
} from "./controller";
import { PeerAssessmentService } from "./services/PeerAssessmentService";

const router = Router();
const svc = new PeerAssessmentService();

router.get("/", getPeerFeedbacksHandler);
router.get("/:id", getPeerFeedbackHandler);

export default router;