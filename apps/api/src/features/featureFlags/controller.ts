import type { Request, Response } from "express";
import { listDefaultEnterpriseFeatureFlags } from "./service.js";

export async function listFeatureFlagsHandler(_req: Request, res: Response) {
  res.json(await listDefaultEnterpriseFeatureFlags());
}
