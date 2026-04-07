import type { Response } from "express";

export function setSensitiveNoStore(res: Response) {
  res.setHeader("Cache-Control", "no-store");
}
