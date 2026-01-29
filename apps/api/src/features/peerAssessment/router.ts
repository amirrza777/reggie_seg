import { Router } from "express";

const router = Router();

import {
  getTeammatesHandler,
  createAssessmentHandler,
  getAssessmentHandler,
  updateAssessmentHandler,
  getAssessmentsHandler,
  getAssessmentByIdHandler,
} from "./controller.js"

router.get("/teams/:teamId/teammates", getTeammatesHandler) // Get teammates in a team
router.post("/", createAssessmentHandler) // Create new assessment
router.get("/", getAssessmentHandler) // Get existing assessment
router.put("/:id", updateAssessmentHandler) // Update assessment answers

router.get("/user/:userId", getAssessmentsHandler); // Get all peer assessments for a user
router.get("/feedback/:feedbackId", getAssessmentByIdHandler); // Get a specific peer feedback by ID

export default router
