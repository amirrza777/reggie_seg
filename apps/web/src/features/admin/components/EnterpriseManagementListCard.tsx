import { normalizeSearchQuery } from "@/shared/lib/search";
import type { FormEvent, ReactNode } from "react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { PaginationControls, PaginationPageJump } from "@/shared/ui/PaginationControls";
import { SearchField } from "@/shared/ui/SearchField";
import { Table } from "@/shared/ui/Table";

type RequestState = "idle" | "loading" | "success" | "error";

type EnterpriseManagementListCardProps = {
  status: RequestState;
  enterpriseTableStatus: RequestState;
  message: string | null;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  rows: Array<Array<ReactNode>>;
  currentPage: number;
  setCurrentPage: (update: (prev: number) => number) => void;
  pageInput: string;
  setPageInput: (value: string) => void;
  enterpriseTotal: number;
  enterpriseTotalPages: number;
  effectiveEnterpriseTotalPages: number;
  enterpriseStart: number;
  enterpriseEnd: number;
  onOpenCreateModal: () => void;
  handlePageJump: (event: FormEvent<HTMLFormElement>) => void;
  applyPageInput: (value: string) => void;
};

function EnterpriseTableSummary({
  enterpriseTableStatus,
  enterpriseTotal,
  enterpriseStart,
  enterpriseEnd,
}: {
  enterpriseTableStatus: RequestState;
  enterpriseTotal: number;
  enterpriseStart: number;
  enterpriseEnd: number;
}) {
  if (enterpriseTableStatus === "loading" && enterpriseTotal === 0) {
    return "Loading enterprises...";
  }
  if (enterpriseTotal === 0) {
    return "Showing 0 enterprises.";
  }
  return `Showing ${enterpriseStart}-${enterpriseEnd} of ${enterpriseTotal} enterprise${enterpriseTotal === 1 ? "" : "s"}.`;
}

export function EnterpriseManagementListCard(props: EnterpriseManagementListCardProps) {
  const hasRows = props.rows.length > 0;
  const showSkeletonTable = props.enterpriseTableStatus === "loading" && !hasRows;

  return (
    <Card title="Enterprises" className="user-management-card" action={<EnterpriseCardActions searchQuery={props.searchQuery} setSearchQuery={props.setSearchQuery} onOpenCreateModal={props.onOpenCreateModal} />}>
      <EnterpriseErrorMessage message={props.message} status={props.status} />
      <div className="user-management__toolbar">
        <span className="ui-note ui-note--muted">
          <EnterpriseTableSummary
            enterpriseTableStatus={props.enterpriseTableStatus}
            enterpriseTotal={props.enterpriseTotal}
            enterpriseStart={props.enterpriseStart}
            enterpriseEnd={props.enterpriseEnd}
          />
        </span>
      </div>
      {hasRows || showSkeletonTable ? (
        <EnterpriseRowsTable {...props} />
      ) : (
        <EnterpriseEmptyState searchQuery={props.searchQuery} />
      )}
    </Card>
  );
}

function EnterpriseCardActions({
  searchQuery,
  setSearchQuery,
  onOpenCreateModal,
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onOpenCreateModal: () => void;
}) {
  return (
    <div className="ui-row enterprise-management__actions">
      <SearchField
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        className="enterprise-management__search"
        placeholder="Search by enterprise name, code, or account breakdown"
        aria-label="Search enterprises"
      />
      <Button type="button" className="enterprise-management__create-trigger" onClick={onOpenCreateModal}>
        Create
      </Button>
    </div>
  );
}

function EnterpriseErrorMessage({ message, status }: { message: string | null; status: RequestState }) {
  if (!message || status !== "error") {
    return null;
  }

  return (
    <div className="status-alert status-alert--error status-alert--spaced">
      <span>{message}</span>
    </div>
  );
}

function EnterpriseRowsPagination(props: EnterpriseManagementListCardProps) {
  return (
    <PaginationControls
      ariaLabel="Enterprise pagination"
      page={props.currentPage}
      totalPages={props.enterpriseTotalPages}
      onPreviousPage={() => props.setCurrentPage((prev) => Math.max(1, prev - 1))}
      onNextPage={() => props.setCurrentPage((prev) => Math.min(props.effectiveEnterpriseTotalPages, prev + 1))}
    >
      <PaginationPageJump
        pageInputId="enterprise-page-input"
        pageInput={props.pageInput}
        totalPages={props.enterpriseTotalPages}
        pageJumpAriaLabel="Go to enterprise page number"
        onPageInputChange={props.setPageInput}
        onPageInputBlur={() => props.applyPageInput(props.pageInput)}
        onPageJump={props.handlePageJump}
      />
    </PaginationControls>
  );
}

function EnterpriseRowsTable(props: EnterpriseManagementListCardProps) {
  const showSkeletonTable = props.enterpriseTableStatus === "loading" && props.rows.length === 0;
  const showPagination = props.enterpriseTotalPages > 1 && !showSkeletonTable;

  return (
    <>
      <Table
        headers={["Enterprise", "Accounts", "Workspace", "Created", "Manage accounts and delete"]}
        rows={props.rows}
        className="enterprise-management__table"
        rowClassName="enterprise-management__row"
        columnTemplate="var(--enterprise-management-columns)"
        isLoading={showSkeletonTable}
        loadingLabel="Loading enterprises..."
        loadingRowCount={6}
      />
      {showPagination ? <EnterpriseRowsPagination {...props} /> : null}
    </>
  );
}

function EnterpriseEmptyState({
  searchQuery,
}: {
  searchQuery: string;
}) {
  return (
    <div className="ui-empty-state">
      <p>
        {normalizeSearchQuery(searchQuery)
          ? `No enterprises match "${searchQuery.trim()}".`
          : "No enterprises found."}
      </p>
    </div>
  );
}
