"use client";

import { useId, useMemo } from "react";
import type { EnterpriseAssignableUser } from "@/features/enterprise/types";
import { normalizeSearchQuery } from "@/shared/lib/search";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { SearchField } from "@/shared/ui/SearchField";

type RequestState = "idle" | "loading" | "success" | "error";

export type ModuleAccessSearchSectionProps = {
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
  onCommitPageJump: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  loadingLabel: string;
  zeroLabel: string;
  noResultsLabel: (query: string) => string;
  emptyLabel: string;
  selectedCountLabel: string;
  /** When set, rows that were selected on load but are now unchecked show a removal highlight. */
  baselineSelectedSet?: Set<number>;
  /**
   * Within this page of results, users who were in {@link baselineSelectedSet} on load are listed first
   * (then by name). Order does not change when the user checks or unchecks boxes.
   */
  sortSelectedFirst?: boolean;
  /** Limit search to users not yet on this module (header switch). */
  onlyWithoutModuleAccess: boolean;
  onToggleOnlyWithoutModuleAccess: () => void;
  onlyWithoutModuleAccessDisabled: boolean;
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
  isPendingRemoval,
  onToggle,
  disabled,
}: {
  user: EnterpriseAssignableUser;
  groupLabel: string;
  isSelected: boolean;
  isPendingRemoval: boolean;
  onToggle: (userId: number, checked: boolean) => void;
  disabled: boolean;
}) {
  const itemClass = [
    "enterprise-module-create__access-item",
    isSelected ? "is-selected" : "",
    isPendingRemoval ? "is-pending-removal" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label key={`${groupLabel}-${user.id}`} className={itemClass}>
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
  onCommitPageJump,
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
  onCommitPageJump: () => void;
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
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCommitPageJump();
            }
          }}
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

/**
 * Searchable, paginated checklist for assigning module-related accounts (leads, TAs, students).
 */
export function ModuleAccessSearchSection(props: ModuleAccessSearchSectionProps) {
  const enrollmentScopeLabelId = useId();
  const displayUsers = useMemo(() => {
    if (!props.sortSelectedFirst) return props.users;
    const orderSet = props.baselineSelectedSet;
    if (!orderSet || orderSet.size === 0) return props.users;
    return [...props.users].sort((a, b) => {
      const aTop = orderSet.has(a.id) ? 0 : 1;
      const bTop = orderSet.has(b.id) ? 0 : 1;
      if (aTop !== bTop) return aTop - bTop;
      const an = `${a.firstName} ${a.lastName}`.trim().toLocaleLowerCase();
      const bn = `${b.firstName} ${b.lastName}`.trim().toLocaleLowerCase();
      return an.localeCompare(bn);
    });
  }, [props.users, props.baselineSelectedSet, props.sortSelectedFirst]);

  return (
    <div className="enterprise-modules__create-field enterprise-module-create__field">
      <div className="module-access-search__head">
        <div className="module-access-search__head-text">
          <label htmlFor={props.searchId} className="enterprise-modules__create-field-label">
            {props.label}
          </label>
          <p className="ui-note ui-note--muted">{props.helperText}</p>
        </div>

        {/* Filter out current users toggle */}
        <div className="module-access-search__head-actions">
          <div className="enterprise-module-create__filter-toggle enterprise-module-create__filter-toggle--header-inline">
            <span id={enrollmentScopeLabelId} className="enterprise-module-create__filter-toggle-label">
              Only show users without access to this module
            </span>
            <button
              type="button"
              role="switch"
              disabled={props.onlyWithoutModuleAccessDisabled}
              className="enterprise-module-create__filter-switch"
              onClick={props.onToggleOnlyWithoutModuleAccess}
            />
          </div>
        </div>
      </div>

      <SearchField
        id={props.searchId}
        value={props.searchQuery}
        onChange={(event) => props.onSearchChange(event.target.value)}
        placeholder={props.searchPlaceholder}
        className="enterprise-modules__search"
      />

      <span className="ui-note ui-note--muted">
        <AccessSummaryLabel
          status={props.status}
          total={props.total}
          start={props.start}
          end={props.end}
          loadingLabel={props.loadingLabel}
          zeroLabel={props.zeroLabel}
        />
      </span>

      <div className="enterprise-module-create__access-list" role="group" aria-label={props.groupLabel}>
        {displayUsers.map((user) => {
          const isSelected = props.selectedSet.has(user.id);
          const isPendingRemoval = Boolean(
            props.baselineSelectedSet?.has(user.id) && !isSelected,
          );
          return (
            <AccessUserItem
              key={`${props.groupLabel}-${user.id}`}
              user={user}
              groupLabel={props.groupLabel}
              isSelected={isSelected}
              isPendingRemoval={isPendingRemoval}
              onToggle={props.onToggle}
              disabled={props.isCheckedDisabled ? props.isCheckedDisabled(user) : false}
            />
          );
        })}
      </div>
      {props.users.length === 0 ? (
        <span className="ui-note ui-note--muted">
          {props.status === "loading"
            ? props.loadingLabel
            : normalizeSearchQuery(props.searchQuery)
              ? props.noResultsLabel(props.searchQuery.trim())
              : props.emptyLabel}
        </span>
      ) : null}
      {props.message ? <span className="enterprise-module-create__field-error">{props.message}</span> : null}
      <AccessPagination
        label={props.label}
        page={props.page}
        pageInput={props.pageInput}
        totalPages={props.totalPages}
        pageInputId={props.pageInputId}
        pageJumpAriaLabel={props.pageJumpAriaLabel}
        onPageInputChange={props.onPageInputChange}
        onPageInputBlur={props.onPageInputBlur}
        onCommitPageJump={props.onCommitPageJump}
        onPreviousPage={props.onPreviousPage}
        onNextPage={props.onNextPage}
      />
      <span className="ui-note ui-note--muted">{props.selectedCountLabel}</span>
    </div>
  );
}
