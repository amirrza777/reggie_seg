import type { Dispatch, SetStateAction } from "react";
import type { ArchiveTab } from "../types";
import { archivePillNavLinkClass } from "../lib/archivePillNav";
import type { ArchiveListScope } from "../lib/archiveScopes";

const TAB_ITEMS: { key: ArchiveTab; label: string }[] = [
  { key: "modules", label: "Modules" },
  { key: "projects", label: "Projects" },
];

export function ArchiveTabs({
  activeTab,
  setActiveTab,
}: {
  activeTab: ArchiveTab;
  setActiveTab: Dispatch<SetStateAction<ArchiveTab>>;
}) {
  return (
    <nav className="pill-nav archive-tabs" role="tablist" aria-label="Archive sections">
      {TAB_ITEMS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.key}
          tabIndex={activeTab === tab.key ? 0 : -1}
          className={archivePillNavLinkClass(activeTab === tab.key)}
          onClick={() => setActiveTab(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

const SCOPE_OPTIONS: { key: ArchiveListScope; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "All active" },
  { key: "archived", label: "All archived" },
];

export function ArchiveListScopeToolbar({
  scope,
  onScopeChange,
  ariaLabel,
}: {
  scope: ArchiveListScope;
  onScopeChange: (next: ArchiveListScope) => void;
  ariaLabel: string;
}) {
  return (
    <nav className="pill-nav archive-module-scope" role="group" aria-label={ariaLabel}>
      {SCOPE_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          className={archivePillNavLinkClass(scope === opt.key)}
          aria-pressed={scope === opt.key}
          onClick={() => onScopeChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </nav>
  );
}
