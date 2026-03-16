import type { Request, Response } from "express";

/** Handles health-check requests for the API. */
export function healthHandler(_req: Request, res: Response) {
  res.json({ ok: true, message: "API is running" });
}
