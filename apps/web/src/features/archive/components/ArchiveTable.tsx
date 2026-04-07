import Link from "next/link";
import type { ArchiveTab } from "../types";
import type { ArchiveTableRowModel } from "../lib/archiveTableRows";
import { ArchiveRowInfoHintIcon, ArchiveStatusStack } from "./ArchiveTableHintButtons";

type ArchiveTableProps = {
  rows: ArchiveTableRowModel[];
  type: ArchiveTab;
  loading: string | null;
  onToggle: (type: ArchiveTab, id: number, isArchived: boolean) => void;
  emptyMessage?: string;
};

function primaryStatusForRow(
  type: ArchiveTab,
  moduleRowArchived: boolean,
  projectRowArchived: boolean,
  archivedAt: string | null,
): { variant: "active" | "archived"; label: string; archivedAt: string | null | undefined } {
  if (type === "modules") {
    return {
      variant: moduleRowArchived ? "archived" : "active",
      label: moduleRowArchived ? "Archived" : "Active",
      archivedAt: moduleRowArchived ? archivedAt : null,
    };
  }
  return {
    variant: projectRowArchived ? "archived" : "active",
    label: projectRowArchived ? "Project archived" : "Project active",
    archivedAt: projectRowArchived ? archivedAt : null,
  };
}

function ArchiveTableRow({
  row,
  type,
  loading,
  onToggle,
}: {
  row: ArchiveTableRowModel;
  type: ArchiveTab;
  loading: string | null;
  onToggle: (type: ArchiveTab, id: number, isArchived: boolean) => void;
}) {
  const entityArchived = Boolean(row.archivedAt);
  const projectArchived = type === "projects" && entityArchived;
  const moduleRowArchived = type === "modules" && entityArchived;
  const rowReadOnly =
    type === "modules" ? moduleRowArchived : projectArchived || Boolean(row.moduleArchived);
  const key = `${type}-${row.id}`;
  const primary = primaryStatusForRow(type, moduleRowArchived, projectArchived, row.archivedAt);
  const rowHint = row.moduleStatusTitle;
  const showProjectExtras = type === "projects" && rowHint != null;

  return (
    <tr className={rowReadOnly ? "archive-row--archived" : ""}>
      <td className="archive-row__name">
        <Link href={row.href} className="archive-row__entity-link">
          {row.name}
        </Link>
      </td>
      <td className="archive-row__subtitle">
        <Link href={row.href} className="archive-row__entity-link archive-row__entity-link--subtitle">
          {row.subtitle}
        </Link>
      </td>
      {showProjectExtras ? (
        <td className="archive-table__cell--status">
          <ArchiveStatusStack
            variant={row.moduleArchived ? "archived" : "active"}
            label={row.moduleArchived ? "Module archived" : "Module active"}
            archivedAt={row.moduleArchived ? row.moduleArchivedAt : null}
          />
        </td>
      ) : null}
      <td className="archive-table__cell--status">
        <ArchiveStatusStack variant={primary.variant} label={primary.label} archivedAt={primary.archivedAt} />
      </td>
      <td>
        <button
          type="button"
          className={`archive-btn ${entityArchived ? "archive-btn--unarchive" : "archive-btn--archive"}`}
          disabled={loading === key}
          onClick={() => onToggle(type, row.id, entityArchived)}
        >
          {loading === key ? "…" : entityArchived ? "Unarchive" : "Archive"}
        </button>
      </td>
      {showProjectExtras ? (
        <td className="archive-table__cell--row-hint">
          <ArchiveRowInfoHintIcon label={rowHint} />
        </td>
      ) : null}
    </tr>
  );
}

export function ArchiveTable({ rows, type, loading, onToggle, emptyMessage }: ArchiveTableProps) {
  if (rows.length === 0) {
    return <p className="archive-empty">{emptyMessage ?? `No ${type} found.`}</p>;
  }
  const showModuleStatus = type === "projects";
  return (
    <div className="archive-table-wrap">
      <table className="archive-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Details</th>
            {showModuleStatus ? <th>Module status</th> : null}
            <th>{type === "modules" ? "Status" : "Project status"}</th>
            <th>Action</th>
            {showModuleStatus ? (
              <th className="archive-table__th--icon" scope="col">
                <span className="ui-visually-hidden">Module and project status help</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ArchiveTableRow key={row.id} row={row} type={type} loading={loading} onToggle={onToggle} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
