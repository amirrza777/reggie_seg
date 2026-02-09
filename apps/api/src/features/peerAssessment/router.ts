import { Router } from "express";

const router = Router();

import {
  getTeammatesHandler,
  createAssessmentHandler,
  getAssessmentHandler,
  updateAssessmentHandler,
  getAssessmentsHandler,
  getAssessmentByIdHandler,
  getQuestionsForProjectHandler
} from "./controller.js"

router.get("/teams/:teamId/teammates", getTeammatesHandler) // Get teammates in a team
router.post("/", createAssessmentHandler) // Create new assessment
router.get("/", getAssessmentHandler) // Get existing assessment with params
router.put("/:id", updateAssessmentHandler) // Update assessment answers
router.get("/projects/:projectId/questions", getQuestionsForProjectHandler); // Get assessment questions for a project
router.get("/projects/:projectId/user/:userId", getAssessmentsHandler); // Get all peer assessments for a user in a project
router.get("/:id", getAssessmentByIdHandler); // Get a specific peer assessment by ID

export default router

