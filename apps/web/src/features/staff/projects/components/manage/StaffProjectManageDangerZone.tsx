"use client";

import type { ReactNode } from "react";
import { Button } from "@/shared/ui/Button";

export type StaffProjectManageDangerZoneProps = {
  title: string;
  description: ReactNode;
  confirmInputId: string;
  confirmChecked: boolean;
  onConfirmChange: (checked: boolean) => void;
  confirmDisabled: boolean;
  confirmLabel: ReactNode;
  actionLabel: string;
  actionPendingLabel: string;
  isActionPending: boolean;
  onAction: () => void;
  actionDisabled: boolean;
  buttonVariant: "primary" | "ghost" | "danger";
  className?: string;
};

export function StaffProjectManageDangerZone({
  title,
  description,
  confirmInputId,
  confirmChecked,
  onConfirmChange,
  confirmDisabled,
  confirmLabel,
  actionLabel,
  actionPendingLabel,
  isActionPending,
  onAction,
  actionDisabled,
  buttonVariant,
  className,
}: StaffProjectManageDangerZoneProps) {
  const rootClass = [
    "enterprise-modules__create-field",
    "enterprise-module-create__field",
    "enterprise-module-create__field--danger",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <div className="enterprise-module-create__danger-zone">
        <h3 className="enterprise-module-create__danger-title">{title}</h3>
        <p className="ui-note">{description}</p>
        <label htmlFor={confirmInputId} className="enterprise-module-create__danger-confirm">
          <input
            id={confirmInputId}
            type="checkbox"
            checked={confirmChecked}
            onChange={(event) => onConfirmChange(event.currentTarget.checked)}
            disabled={confirmDisabled}
          />
          <span>{confirmLabel}</span>
        </label>
        <div className="ui-row ui-row--end">
          <Button type="button" variant={buttonVariant} onClick={onAction} disabled={actionDisabled}>
            {isActionPending ? actionPendingLabel : actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
