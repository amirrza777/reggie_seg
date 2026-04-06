import { normalizeSearchQuery } from "@/shared/lib/search";
import { SearchField } from "@/shared/ui/SearchField";
import { SkeletonText } from "@/shared/ui/Skeleton";
import {
  AccessPagination,
  AccessSummaryLabel,
  AccessUserItem,
  type EnterpriseModuleAccessSectionProps,
} from "./EnterpriseModuleAccessSection";

export function EnterpriseModuleAccessSectionContent({
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
  const showSkeletonList = status === "loading" && users.length === 0;

  return (
    <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--access">
      <label htmlFor={searchId} className="enterprise-modules__create-field-label">
        {label}
      </label>
      <p className="ui-note ui-note--muted">{helperText}</p>
      <SearchField
        id={searchId}
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchAriaLabel}
      />
      <span className="ui-note ui-note--muted">
        <AccessSummaryLabel status={status} total={total} start={start} end={end} loadingLabel={loadingLabel} zeroLabel={zeroLabel} />
      </span>
      <div className="enterprise-module-create__access-list" role="group" aria-label={groupLabel}>
        {showSkeletonList
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`${groupLabel}-skeleton-${index}`}
                className="enterprise-module-create__access-item enterprise-module-create__access-item--skeleton"
                aria-hidden="true"
              >
                <SkeletonText lines={2} widths={["42%", "68%"]} />
              </div>
            ))
          : users.map((user) => (
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
      {users.length === 0 && !showSkeletonList ? (
        <span className="ui-note ui-note--muted">
          {status === "loading"
            ? loadingLabel
            : normalizeSearchQuery(searchQuery)
              ? noResultsLabel(searchQuery.trim())
              : emptyLabel}
        </span>
      ) : null}
      {showSkeletonList ? <span className="ui-visually-hidden">{loadingLabel}</span> : null}
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
