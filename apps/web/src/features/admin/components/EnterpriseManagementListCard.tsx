import { normalizeSearchQuery } from "@/shared/lib/search";
import type { FormEvent, ReactNode } from "react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { FormField } from "@/shared/ui/FormField";
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
  if (enterpriseTableStatus === "loading" && enterpriseTotal === 0) return "Loading enterprises...";
  if (enterpriseTotal === 0) return "Showing 0 enterprises.";
  return `Showing ${enterpriseStart}-${enterpriseEnd} of ${enterpriseTotal} enterprise${enterpriseTotal === 1 ? "" : "s"}.`;
}

function EnterprisePageControls(props: {
  currentPage: number;
  setCurrentPage: (update: (prev: number) => number) => void;
  pageInput: string;
  setPageInput: (value: string) => void;
  effectiveEnterpriseTotalPages: number;
  handlePageJump: (event: FormEvent<HTMLFormElement>) => void;
  applyPageInput: (value: string) => void;
}) {
  return (
    <div className="user-management__pagination" aria-label="Enterprise pagination">
      <PaginationButton direction="previous" {...props} />
      <EnterprisePageJumpForm {...props} />
      <PaginationButton direction="next" {...props} />
    </div>
  );
}

function PaginationButton({
  direction,
  currentPage,
  setCurrentPage,
  effectiveEnterpriseTotalPages,
}: {
  direction: "previous" | "next";
  currentPage: number;
  setCurrentPage: (update: (prev: number) => number) => void;
  effectiveEnterpriseTotalPages: number;
}) {
  const isPrevious = direction === "previous";
  const label = isPrevious ? "Previous" : "Next";
  const disabled = isPrevious ? currentPage === 1 : currentPage === effectiveEnterpriseTotalPages;
  const advance = () =>
    setCurrentPage((prev) =>
      isPrevious ? Math.max(1, prev - 1) : Math.min(effectiveEnterpriseTotalPages, prev + 1)
    );

  return (
    <Button type="button" variant="ghost" size="sm" onClick={advance} disabled={disabled}>
      {label}
    </Button>
  );
}

function EnterprisePageJumpForm({
  pageInput,
  setPageInput,
  effectiveEnterpriseTotalPages,
  handlePageJump,
  applyPageInput,
}: {
  pageInput: string;
  setPageInput: (value: string) => void;
  effectiveEnterpriseTotalPages: number;
  handlePageJump: (event: FormEvent<HTMLFormElement>) => void;
  applyPageInput: (value: string) => void;
}) {
  return (
    <form className="user-management__page-jump" onSubmit={handlePageJump}>
      <label htmlFor="enterprise-page-input" className="user-management__page-jump-label">
        Page
      </label>
      <FormField
        id="enterprise-page-input"
        type="number"
        min={1}
        max={effectiveEnterpriseTotalPages}
        step={1}
        inputMode="numeric"
        value={pageInput}
        onChange={(event) => setPageInput(event.target.value)}
        onBlur={() => applyPageInput(pageInput)}
        className="user-management__page-jump-input"
        aria-label="Go to enterprise page number"
      />
      <span className="muted user-management__page-total">of {effectiveEnterpriseTotalPages}</span>
    </form>
  );
}

export function EnterpriseManagementListCard(props: EnterpriseManagementListCardProps) {
  const hasRows = props.rows.length > 0;

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
      {hasRows ? <EnterpriseRowsTable {...props} /> : <EnterpriseEmptyState searchQuery={props.searchQuery} enterpriseTableStatus={props.enterpriseTableStatus} />}
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
  if (!message || status !== "error") return null;

  return (
    <div className="status-alert status-alert--error status-alert--spaced">
      <span>{message}</span>
    </div>
  );
}

function EnterpriseRowsTable(props: EnterpriseManagementListCardProps) {
  return (
    <>
      <Table
        headers={["Enterprise", "Accounts", "Workspace", "Created", "Manage accounts and delete"]}
        rows={props.rows}
        className="enterprise-management__table"
        rowClassName="enterprise-management__row"
        columnTemplate="var(--enterprise-management-columns)"
      />
      {props.enterpriseTotalPages > 1 ? (
        <EnterprisePageControls
          currentPage={props.currentPage}
          setCurrentPage={props.setCurrentPage}
          pageInput={props.pageInput}
          setPageInput={props.setPageInput}
          effectiveEnterpriseTotalPages={props.effectiveEnterpriseTotalPages}
          handlePageJump={props.handlePageJump}
          applyPageInput={props.applyPageInput}
        />
      ) : null}
    </>
  );
}

function EnterpriseEmptyState({
  searchQuery,
  enterpriseTableStatus,
}: {
  searchQuery: string;
  enterpriseTableStatus: RequestState;
}) {
  return (
    <div className="ui-empty-state">
      <p>
        {enterpriseTableStatus === "loading"
          ? "Loading enterprises..."
          : normalizeSearchQuery(searchQuery)
            ? `No enterprises match "${searchQuery.trim()}".`
            : "No enterprises found."}
      </p>
    </div>
  );
}
