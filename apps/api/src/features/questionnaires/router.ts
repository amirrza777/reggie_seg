import { Router } from "express"
import {
  createTemplateHandler,
  getTemplateHandler,
  getAllTemplatesHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
} from "./controller"
import nodeHttp = require("node:http");

const router = Router()

router.get("/", getAllTemplatesHandler);
router.post("/new", createTemplateHandler);
router.get("/:id", getTemplateHandler);
router.put("/:id", updateTemplateHandler);
router.delete("/:id", deleteTemplateHandler);

export default router;
