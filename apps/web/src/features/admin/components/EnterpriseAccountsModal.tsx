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

type EnterpriseAccountsPaginationProps = Pick<
  EnterpriseAccountsModalProps,
  | "userPage"
  | "userPageInput"
  | "userTotalPages"
  | "effectiveUserTotalPages"
  | "onUserPageChange"
  | "onUserPageInputChange"
  | "onUserPageInputBlur"
  | "onUserPageJump"
>;

function AccountsCountLabel(props: {
  usersStatus: RequestState;
  userTotal: number;
  userStart: number;
  userEnd: number;
}) {
  if (props.usersStatus === "loading" && props.userTotal === 0) {
    return "Loading accounts...";
  }
  if (props.userTotal === 0) {
    return "Showing 0 accounts.";
  }
  return `Showing ${props.userStart}-${props.userEnd} of ${props.userTotal} account${props.userTotal === 1 ? "" : "s"}.`;
}

function EnterpriseAccountsPagination(props: EnterpriseAccountsPaginationProps) {
  return (
    <PaginationControls
      ariaLabel="Enterprise users pagination"
      page={props.userPage}
      totalPages={props.userTotalPages}
      onPreviousPage={() => props.onUserPageChange((prev) => Math.max(1, prev - 1))}
      onNextPage={() => props.onUserPageChange((prev) => Math.min(props.effectiveUserTotalPages, prev + 1))}
    >
      <PaginationPageJump
        pageInputId="enterprise-user-page-input"
        pageInput={props.userPageInput}
        totalPages={props.userTotalPages}
        pageJumpAriaLabel="Go to enterprise user page number"
        onPageInputChange={props.onUserPageInputChange}
        onPageInputBlur={props.onUserPageInputBlur}
        onPageJump={props.onUserPageJump}
      />
    </PaginationControls>
  );
}

function EnterpriseAccountsModalHeader({ enterprise, onClose }: { enterprise: EnterpriseRecord; onClose: () => void }) {
  return (
    <div className="modal__header ui-modal-header">
      <div className="ui-stack-sm">
        <h3 id="enterprise-users-title">{enterprise.name} accounts</h3>
        <p className="muted">Enterprise code {enterprise.code}. Manage staff/student roles and account status for this enterprise.</p>
      </div>
      <Button type="button" variant="ghost" className="modal__close-btn" aria-label="Close" onClick={onClose}>
        ×
      </Button>
    </div>
  );
}

function EnterpriseAccountsStatusMessage({ usersMessage, usersStatus }: { usersMessage: string | null; usersStatus: RequestState }) {
  if (!usersMessage) {
    return null;
  }
  return (
    <div className={usersStatus === "error" ? "status-alert status-alert--error" : "ui-note ui-note--muted"}>
      <span>{usersMessage}</span>
    </div>
  );
}

function EnterpriseAccountsTableSection(props: EnterpriseAccountsModalProps & { showSkeletonTable: boolean }) {
  return (
    <>
      <div className="enterprise-management__modal-table">
        <Table
          headers={["Email", "Name", "Role", "Account status"]}
          rows={props.userRows}
          className="user-management__table"
          headClassName="user-management__head"
          rowClassName="user-management__row"
          columnTemplate="var(--user-management-columns)"
          isLoading={props.showSkeletonTable}
          loadingLabel="Loading accounts..."
          loadingRowCount={6}
        />
      </div>
      {!props.showSkeletonTable ? <EnterpriseAccountsPagination {...props} /> : null}
    </>
  );
}

function EnterpriseAccountsEmptyState({ userSearchQuery }: { userSearchQuery: string }) {
  return (
    <div className="ui-empty-state">
      <p>
        {normalizeSearchQuery(userSearchQuery) ? `No accounts match "${userSearchQuery.trim()}".` : "No accounts found in this enterprise."}
      </p>
    </div>
  );
}

function EnterpriseAccountsModalBody(props: EnterpriseAccountsModalProps & { showSkeletonTable: boolean }) {
  const showTable = props.userRows.length > 0 || props.showSkeletonTable;
  return (
    <div className="modal__body admin-modal__body">
      <div className="ui-toolbar enterprise-management__modal-toolbar">
        <SearchField
          value={props.userSearchQuery}
          onChange={(event) => props.onUserSearchQueryChange(event.target.value)}
          className="enterprise-management__modal-search"
          placeholder="Search by name, email, role, or ID"
          aria-label="Search enterprise users"
        />
      </div>
      <EnterpriseAccountsStatusMessage usersMessage={props.usersMessage} usersStatus={props.usersStatus} />
      <span className="ui-note ui-note--muted"><AccountsCountLabel usersStatus={props.usersStatus} userTotal={props.userTotal} userStart={props.userStart} userEnd={props.userEnd} /></span>
      {showTable ? <EnterpriseAccountsTableSection {...props} /> : <EnterpriseAccountsEmptyState userSearchQuery={props.userSearchQuery} />}
    </div>
  );
}

function EnterpriseAccountsModalDialog(props: EnterpriseAccountsModalProps & { enterprise: EnterpriseRecord; showSkeletonTable: boolean }) {
  return (
    <div className="modal__dialog admin-modal ui-content-width enterprise-management__modal" onClick={(event) => event.stopPropagation()}>
      <EnterpriseAccountsModalHeader enterprise={props.enterprise} onClose={props.onClose} />
      <EnterpriseAccountsModalBody {...props} />
    </div>
  );
}

export function EnterpriseAccountsModal(props: EnterpriseAccountsModalProps) {
  if (!props.enterprise) {
    return null;
  }
  const showSkeletonTable = props.usersStatus === "loading" && props.userRows.length === 0;
  return (
    <ModalPortal>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="enterprise-users-title" onClick={props.onClose}>
        <EnterpriseAccountsModalDialog {...props} enterprise={props.enterprise} showSkeletonTable={showSkeletonTable} />
      </div>
    </ModalPortal>
  );
}
