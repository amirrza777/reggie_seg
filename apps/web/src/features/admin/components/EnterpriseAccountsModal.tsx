import { normalizeSearchQuery } from "@/shared/lib/search";
import type { FormEvent, ReactNode } from "react";
import { Button } from "@/shared/ui/Button";
import { ModalPortal } from "@/shared/ui/ModalPortal";
import { PaginationControls, PaginationPageJump } from "@/shared/ui/PaginationControls";
import { SearchField } from "@/shared/ui/SearchField";
import { Table } from "@/shared/ui/Table";
import type { EnterpriseRecord } from "../types";

type RequestState = "idle" | "loading" | "success" | "error";

type EnterpriseAccountsModalProps = {
  enterprise: EnterpriseRecord | null;
  usersStatus: RequestState;
  usersMessage: string | null;
  userSearchQuery: string;
  onUserSearchQueryChange: (value: string) => void;
  userRows: Array<Array<ReactNode>>;
  userTotal: number;
  userStart: number;
  userEnd: number;
  userPage: number;
  userPageInput: string;
  userTotalPages: number;
  effectiveUserTotalPages: number;
  onClose: () => void;
  onUserPageChange: (update: (prev: number) => number) => void;
  onUserPageInputChange: (value: string) => void;
  onUserPageInputBlur: () => void;
  onUserPageJump: (event: FormEvent<HTMLFormElement>) => void;
};

function AccountsCountLabel({ usersStatus, userTotal, userStart, userEnd }: { usersStatus: RequestState; userTotal: number; userStart: number; userEnd: number }) {
  if (usersStatus === "loading" && userTotal === 0) return "Loading accounts...";
  if (userTotal === 0) return "Showing 0 accounts.";
  return `Showing ${userStart}-${userEnd} of ${userTotal} account${userTotal === 1 ? "" : "s"}.`;
}

function EnterpriseAccountsPagination({
  userPage,
  userPageInput,
  userTotalPages,
  effectiveUserTotalPages,
  onUserPageChange,
  onUserPageInputChange,
  onUserPageInputBlur,
  onUserPageJump,
}: {
  userPage: number;
  userPageInput: string;
  userTotalPages: number;
  effectiveUserTotalPages: number;
  onUserPageChange: (update: (prev: number) => number) => void;
  onUserPageInputChange: (value: string) => void;
  onUserPageInputBlur: () => void;
  onUserPageJump: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <PaginationControls
      ariaLabel="Enterprise users pagination"
      page={userPage}
      totalPages={userTotalPages}
      onPreviousPage={() => onUserPageChange((prev) => Math.max(1, prev - 1))}
      onNextPage={() => onUserPageChange((prev) => Math.min(effectiveUserTotalPages, prev + 1))}
    >
      <PaginationPageJump
        pageInputId="enterprise-user-page-input"
        pageInput={userPageInput}
        totalPages={userTotalPages}
        pageJumpAriaLabel="Go to enterprise user page number"
        onPageInputChange={onUserPageInputChange}
        onPageInputBlur={onUserPageInputBlur}
        onPageJump={onUserPageJump}
      />
    </PaginationControls>
  );
}

export function EnterpriseAccountsModal({
  enterprise,
  usersStatus,
  usersMessage,
  userSearchQuery,
  onUserSearchQueryChange,
  userRows,
  userTotal,
  userStart,
  userEnd,
  userPage,
  userPageInput,
  userTotalPages,
  effectiveUserTotalPages,
  onClose,
  onUserPageChange,
  onUserPageInputChange,
  onUserPageInputBlur,
  onUserPageJump,
}: EnterpriseAccountsModalProps) {
  if (!enterprise) return null;
  const showSkeletonTable = usersStatus === "loading" && userRows.length === 0;

  return (
    <ModalPortal>
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enterprise-users-title"
      onClick={onClose}
    >
      <div
        className="modal__dialog admin-modal ui-content-width enterprise-management__modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header ui-modal-header">
          <div className="ui-stack-sm">
            <h3 id="enterprise-users-title">{enterprise.name} accounts</h3>
            <p className="muted">
              Enterprise code {enterprise.code}. Manage staff/student roles and account status for this enterprise.
            </p>
          </div>
          <Button type="button" variant="ghost" className="modal__close-btn" aria-label="Close" onClick={onClose}>
            ×
          </Button>
        </div>

        <div className="modal__body admin-modal__body">
          <div className="ui-toolbar enterprise-management__modal-toolbar">
            <SearchField
              value={userSearchQuery}
              onChange={(event) => onUserSearchQueryChange(event.target.value)}
              className="enterprise-management__modal-search"
              placeholder="Search by name, email, role, or ID"
              aria-label="Search enterprise users"
            />
          </div>

          {usersMessage ? (
            <div className={usersStatus === "error" ? "status-alert status-alert--error" : "ui-note ui-note--muted"}>
              <span>{usersMessage}</span>
            </div>
          ) : null}

          <span className="ui-note ui-note--muted">
            <AccountsCountLabel usersStatus={usersStatus} userTotal={userTotal} userStart={userStart} userEnd={userEnd} />
          </span>

          {userRows.length > 0 || showSkeletonTable ? (
            <>
              <div className="enterprise-management__modal-table">
                <Table
                  headers={["Email", "Name", "Role", "Account status"]}
                  rows={userRows}
                  className="user-management__table"
                  headClassName="user-management__head"
                  rowClassName="user-management__row"
                  columnTemplate="var(--user-management-columns)"
                  isLoading={showSkeletonTable}
                  loadingLabel="Loading accounts..."
                  loadingRowCount={6}
                />
              </div>
              {!showSkeletonTable ? (
                <EnterpriseAccountsPagination
                  userPage={userPage}
                  userPageInput={userPageInput}
                  userTotalPages={userTotalPages}
                  effectiveUserTotalPages={effectiveUserTotalPages}
                  onUserPageChange={onUserPageChange}
                  onUserPageInputChange={onUserPageInputChange}
                  onUserPageInputBlur={onUserPageInputBlur}
                  onUserPageJump={onUserPageJump}
                />
              ) : null}
            </>
          ) : (
            <div className="ui-empty-state">
              <p>
                {normalizeSearchQuery(userSearchQuery)
                    ? `No accounts match "${userSearchQuery.trim()}".`
                    : "No accounts found in this enterprise."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
