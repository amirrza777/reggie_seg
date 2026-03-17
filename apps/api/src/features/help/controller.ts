import type { Request, Response } from "express";
import { parseHelpSearchPayload, searchHelpRecords } from "./service.js";

export async function searchHelpHandler(req: Request, res: Response) {
  const parsed = parseHelpSearchPayload(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });

  return res.json({ items: searchHelpRecords(parsed.value) });
}
