"use client";

import { AuditLogModalView } from "./AuditLogModal.view";

export function AuditLogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <AuditLogModalView open={open} onClose={onClose} />;
}
