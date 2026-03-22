import { normalizeSearchQuery } from "@/shared/lib/search";
import type { FormEvent, ReactNode } from "react";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
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
  if (userTotalPages <= 1) return null;

  return (
    <div className="user-management__pagination" aria-label="Enterprise users pagination">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onUserPageChange((prev) => Math.max(1, prev - 1))}
        disabled={userPage === 1}
      >
        Previous
      </Button>
      <form className="user-management__page-jump" onSubmit={onUserPageJump}>
        <label htmlFor="enterprise-user-page-input" className="user-management__page-jump-label">
          Page
        </label>
        <FormField
          id="enterprise-user-page-input"
          type="number"
          min={1}
          max={effectiveUserTotalPages}
          step={1}
          inputMode="numeric"
          value={userPageInput}
          onChange={(event) => onUserPageInputChange(event.target.value)}
          onBlur={onUserPageInputBlur}
          className="user-management__page-jump-input"
          aria-label="Go to enterprise user page number"
        />
        <span className="muted user-management__page-total">of {effectiveUserTotalPages}</span>
      </form>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onUserPageChange((prev) => Math.min(effectiveUserTotalPages, prev + 1))}
        disabled={userPage === effectiveUserTotalPages}
      >
        Next
      </Button>
    </div>
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

  return (
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

          {userRows.length > 0 ? (
            <>
              <div className="enterprise-management__modal-table">
                <Table
                  headers={["Email", "Name", "Role", "Account status"]}
                  rows={userRows}
                  className="user-management__table"
                  headClassName="user-management__head"
                  rowClassName="user-management__row"
                  columnTemplate="var(--user-management-columns)"
                />
              </div>
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
            </>
          ) : (
            <div className="ui-empty-state">
              <p>
                {usersStatus === "loading"
                  ? "Loading accounts..."
                  : normalizeSearchQuery(userSearchQuery)
                    ? `No accounts match "${userSearchQuery.trim()}".`
                    : "No accounts found in this enterprise."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
