import type { FormEvent } from "react";
import type { EnterpriseAssignableUser } from "../types";
import { normalizeSearchQuery } from "@/shared/lib/search";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";

type RequestState = "idle" | "loading" | "success" | "error";

type EnterpriseModuleAccessSectionProps = {
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
  onPageJump: (event: FormEvent<HTMLFormElement>) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  loadingLabel: string;
  zeroLabel: string;
  noResultsLabel: (query: string) => string;
  emptyLabel: string;
  selectedCountLabel: string;
};

function AccessSummaryLabel({
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

function AccessUserItem({
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

function AccessPagination({
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
  onPageJump: (event: FormEvent<HTMLFormElement>) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}) {
  if (totalPages <= 1) return null;

  const effectiveTotalPages = Math.max(1, totalPages);
  return (
    <div className="user-management__pagination" aria-label={`${label} search pagination`}>
      <Button type="button" variant="ghost" size="sm" onClick={onPreviousPage} disabled={page === 1}>
        Previous
      </Button>
      <form className="user-management__page-jump" onSubmit={onPageJump}>
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
          className="user-management__page-jump-input"
          aria-label={pageJumpAriaLabel}
        />
        <span className="muted user-management__page-total">of {effectiveTotalPages}</span>
      </form>
      <Button type="button" variant="ghost" size="sm" onClick={onNextPage} disabled={page === effectiveTotalPages}>
        Next
      </Button>
    </div>
  );
}

export function EnterpriseModuleAccessSection({
  label,
  helperText,
  groupLabel,
  searchId,
  searchAriaLabel,
  searchPlaceholder,
  searchQuery,
  onSearchChange,
  status,
  total,
  start,
  end,
  users,
  selectedSet,
  onToggle,
  isCheckedDisabled,
  message,
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
  loadingLabel,
  zeroLabel,
  noResultsLabel,
  emptyLabel,
  selectedCountLabel,
}: EnterpriseModuleAccessSectionProps) {
  return (
    <div className="enterprise-modules__create-field enterprise-module-create__field">
      <label htmlFor={searchId} className="enterprise-modules__create-field-label">
        {label}
      </label>
      <p className="ui-note ui-note--muted">{helperText}</p>
      <FormField
        id={searchId}
        type="search"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchAriaLabel}
      />
      <span className="ui-note ui-note--muted">
        <AccessSummaryLabel status={status} total={total} start={start} end={end} loadingLabel={loadingLabel} zeroLabel={zeroLabel} />
      </span>
      <div className="enterprise-module-create__access-list" role="group" aria-label={groupLabel}>
        {users.map((user) => (
          <AccessUserItem
            key={`${groupLabel}-${user.id}`}
            user={user}
            groupLabel={groupLabel}
            isSelected={selectedSet.has(user.id)}
            onToggle={onToggle}
            disabled={isCheckedDisabled ? isCheckedDisabled(user) : false}
          />
        ))}
      </div>
      {users.length === 0 ? (
        <span className="ui-note ui-note--muted">
          {status === "loading"
            ? loadingLabel
            : normalizeSearchQuery(searchQuery)
              ? noResultsLabel(searchQuery.trim())
              : emptyLabel}
        </span>
      ) : null}
      {message ? <span className="enterprise-module-create__field-error">{message}</span> : null}
      <AccessPagination
        label={label}
        page={page}
        pageInput={pageInput}
        totalPages={totalPages}
        pageInputId={pageInputId}
        pageJumpAriaLabel={pageJumpAriaLabel}
        onPageInputChange={onPageInputChange}
        onPageInputBlur={onPageInputBlur}
        onPageJump={onPageJump}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
      />
      <span className="ui-note ui-note--muted">{selectedCountLabel}</span>
    </div>
  );
}
