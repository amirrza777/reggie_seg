import type { Request, Response, NextFunction } from "express";

type Window = { count: number; resetAt: number };

const store = new Map<string, Window>();

// Prune expired windows every 60 s to prevent unbounded memory growth.
const pruneInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, win] of store) {
    if (now > win.resetAt) store.delete(key);
  }
}, 60_000);
pruneInterval.unref();

function clientKey(req: Request, prefix: string): string {
  return `${prefix}:${req.ip ?? "unknown"}`;
}

export function rateLimit(options: { windowMs: number; max: number; prefix: string }) {
  const { windowMs, max, prefix } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = clientKey(req, prefix);
    const now = Date.now();
    const win = store.get(key);

    if (!win || now > win.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    win.count += 1;

    if (win.count > max) {
      res.setHeader("Retry-After", Math.ceil((win.resetAt - now) / 1000));
      return res.status(429).json({ error: "Too many requests, please try again later." });
    }

    return next();
  };
}