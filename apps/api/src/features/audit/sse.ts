import type { Response } from "express";

const subscribers = new Map<string, Set<Response>>();

export function subscribeToAuditStream(enterpriseId: string, res: Response) {
  if (!subscribers.has(enterpriseId)) {
    subscribers.set(enterpriseId, new Set());
  }
  subscribers.get(enterpriseId)!.add(res);
}

export function unsubscribeFromAuditStream(enterpriseId: string, res: Response) {
  const group = subscribers.get(enterpriseId);
  if (!group) return;
  group.delete(res);
  if (group.size === 0) subscribers.delete(enterpriseId);
}

export function broadcastAuditEvent(enterpriseId: string, data: unknown) {
  const group = subscribers.get(enterpriseId);
  if (!group || group.size === 0) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of group) {
    try {
      res.write(payload);
    } catch {
      group.delete(res);
    }
  }
}