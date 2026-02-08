import { Router } from "express";
import { StaffPeerAssessmentService } from "../services/StaffPeerAssessmentService.js";
import type { ModuleSummary } from "./types.js";

const router = Router();
const staffService = new StaffPeerAssessmentService();

router.get("/modules", async (req, res) => {
  try {
    const staffId = parseInt(req.query.staffId as string);

    if (!staffId || isNaN(staffId)) {
      return res.status(400).json({ error: "staffId is required" });
    }

    const modules: ModuleSummary[] = await staffService.getProgressForMyModules(staffId);

    res.json(modules);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

export default router;
