import { Router } from "express"
import {
  createTemplateHandler,
  getTemplateHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
} from "./controller"

const router = Router()

router.post("/", createTemplateHandler);
router.get("/:id", getTemplateHandler);
router.put("/:id", updateTemplateHandler);
router.delete("/:id", deleteTemplateHandler);

export default router;
