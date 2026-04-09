"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type StaffProjectManageFormCollapsibleProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function StaffProjectManageFormCollapsible({
  title,
  defaultOpen = false,
  children,
}: StaffProjectManageFormCollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);
  return (
    <details
      className="enterprise-module-create__collapsible"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="enterprise-module-create__collapsible-summary">
        <span className="enterprise-module-create__collapsible-summary-text">
          <span className="enterprise-module-create__collapsible-title">{title}</span>
        </span>
      </summary>
      <div className="enterprise-module-create__collapsible-body">{children}</div>
    </details>
  );
}
