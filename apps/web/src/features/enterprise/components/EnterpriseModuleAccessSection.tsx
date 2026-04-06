import type { KeyboardEvent } from "react";
import type { EnterpriseAssignableUser } from "../types";
import { EnterpriseModuleAccessSectionContent } from "./EnterpriseModuleAccessSection.content";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";

type RequestState = "idle" | "loading" | "success" | "error";

export type EnterpriseModuleAccessSectionProps = {
  label: string;
  helperText: string;
  groupLabel: string;
  searchId: string;
  searchAriaLabel: string;
  searchPlaceholder: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  status: RequestState;
  total: number;
  start: number;
  end: number;
  users: EnterpriseAssignableUser[];
  selectedSet: Set<number>;
  onToggle: (userId: number, checked: boolean) => void;
  isCheckedDisabled?: (user: EnterpriseAssignableUser) => boolean;
  message: string | null;
  page: number;
  pageInput: string;
  totalPages: number;
  pageInputId: string;
  pageJumpAriaLabel: string;
  onPageInputChange: (value: string) => void;
  onPageInputBlur: () => void;
  onPageJump: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  loadingLabel: string;
  zeroLabel: string;
  noResultsLabel: (query: string) => string;
  emptyLabel: string;
  selectedCountLabel: string;
};

export function AccessSummaryLabel({
  status,
  total,
  start,
  end,
  loadingLabel,
  zeroLabel,
}: {
  status: RequestState;
  total: number;
  start: number;
  end: number;
  loadingLabel: string;
  zeroLabel: string;
}) {
  if (status === "loading" && total === 0) return loadingLabel;
  if (total === 0) return zeroLabel;
  return `Showing ${start}-${end} of ${total} accounts`;
}

export function AccessUserItem({
  user,
  groupLabel,
  isSelected,
  onToggle,
  disabled,
}: {
  user: EnterpriseAssignableUser;
  groupLabel: string;
  isSelected: boolean;
  onToggle: (userId: number, checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <label key={`${groupLabel}-${user.id}`} className={`enterprise-module-create__access-item ${isSelected ? "is-selected" : ""}`}>
      <input type="checkbox" checked={isSelected} onChange={(event) => onToggle(user.id, event.target.checked)} disabled={disabled} />
      <div className="ui-stack-xs">
        <strong>
          {user.firstName} {user.lastName}
        </strong>
        <span className="muted">
          {user.email} • ID {user.id}
        </span>
      </div>
      <span className={`status-chip ${user.active ? "status-chip--success" : "status-chip--danger"}`}>{user.active ? "Active" : "Inactive"}</span>
    </label>
  );
}

export function AccessPagination({
  label,
  page,
  pageInput,
  totalPages,
  pageInputId,
  pageJumpAriaLabel,
  onPageInputChange,
  onPageInputBlur,
  onPageJump,
  onPreviousPage,
  onNextPage,
}: {
  label: string;
  page: number;
  pageInput: string;
  totalPages: number;
  pageInputId: string;
  pageJumpAriaLabel: string;
  onPageInputChange: (value: string) => void;
  onPageInputBlur: () => void;
  onPageJump: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}) {
  if (totalPages <= 1) return null;

  const effectiveTotalPages = Math.max(1, totalPages);

  const handlePageInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onPageJump();
  };

  return (
    <div className="user-management__pagination" aria-label={`${label} search pagination`}>
      <Button type="button" variant="ghost" size="sm" onClick={onPreviousPage} disabled={page === 1}>
        Previous
      </Button>
      <div className="user-management__page-jump">
        <label htmlFor={pageInputId} className="user-management__page-jump-label">
          Page
        </label>
        <FormField
          id={pageInputId}
          type="number"
          min={1}
          max={effectiveTotalPages}
          step={1}
          inputMode="numeric"
          value={pageInput}
          onChange={(event) => onPageInputChange(event.target.value)}
          onBlur={onPageInputBlur}
          onKeyDown={handlePageInputKeyDown}
          className="user-management__page-jump-input"
          aria-label={pageJumpAriaLabel}
        />
        <span className="muted user-management__page-total">of {effectiveTotalPages}</span>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onNextPage} disabled={page === effectiveTotalPages}>
        Next
      </Button>
    </div>
  );
}

export function EnterpriseModuleAccessSection({
  ...props
}: EnterpriseModuleAccessSectionProps) {
  return <EnterpriseModuleAccessSectionContent {...props} />;
}
