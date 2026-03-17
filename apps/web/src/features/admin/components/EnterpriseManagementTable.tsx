"use client";

import { normalizeSearchQuery } from "@/shared/lib/search";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { ConfirmationModal } from "@/shared/ui/ConfirmationModal";
import { FormField } from "@/shared/ui/FormField";
import { Table } from "@/shared/ui/Table";
import { EnterpriseAccountsModal } from "./EnterpriseAccountsModal";
import { EnterpriseCreateModal } from "./EnterpriseCreateModal";
import { buildEnterpriseRows, buildEnterpriseUserRows } from "./enterpriseManagementRows";
import { useEnterpriseManagementState } from "./useEnterpriseManagementState";

type EnterpriseManagementTableProps = {
  isSuperAdmin: boolean;
};

export function EnterpriseManagementTable({ isSuperAdmin }: EnterpriseManagementTableProps) {
  const {
    status,
    enterpriseTableStatus,
    message,
    toastMessage,
    searchQuery,
    setSearchQuery,
    enterprises,
    currentPage,
    setCurrentPage,
    pageInput,
    setPageInput,
    enterpriseTotal,
    enterpriseTotalPages,
    effectiveEnterpriseTotalPages,
    enterpriseStart,
    enterpriseEnd,
    createModalOpen,
    setCreateModalOpen,
    nameInput,
    setNameInput,
    codeInput,
    setCodeInput,
    isCreating,
    closeCreateModal,
    handleCreateEnterprise,
    deleteState,
    pendingDeleteEnterprise,
    setPendingDeleteEnterprise,
    handleDeleteEnterprise,
    selectedEnterprise,
    setSelectedEnterprise,
    enterpriseUsers,
    enterpriseUsersStatus,
    enterpriseUsersMessage,
    enterpriseUserActionState,
    enterpriseUserSearchQuery,
    setEnterpriseUserSearchQuery,
    enterpriseUserPage,
    setEnterpriseUserPage,
    enterpriseUserPageInput,
    setEnterpriseUserPageInput,
    enterpriseUserTotal,
    enterpriseUserTotalPages,
    effectiveEnterpriseUserTotalPages,
    enterpriseUserStart,
    enterpriseUserEnd,
    openEnterpriseAccounts,
    handleEnterpriseUserRoleChange,
    handleEnterpriseUserStatusToggle,
    handlePageJump,
    handleEnterpriseUserPageJump,
    applyPageInput,
    applyEnterpriseUserPageInput,
  } = useEnterpriseManagementState(isSuperAdmin);

  if (!isSuperAdmin) return null;

  const rows = buildEnterpriseRows({
    enterprises,
    deleteState,
    onOpenAccounts: openEnterpriseAccounts,
    onRequestDelete: setPendingDeleteEnterprise,
    formatDate,
  });

  const enterpriseUserRows = buildEnterpriseUserRows({
    users: enterpriseUsers,
    actionState: enterpriseUserActionState,
    onRoleChange: (userId, role) => {
      void handleEnterpriseUserRoleChange(userId, role);
    },
    onStatusToggle: (userId, nextStatus) => {
      void handleEnterpriseUserStatusToggle(userId, nextStatus);
    },
  });

  return (
    <>
      {toastMessage ? (
        <div className="ui-toast-layer" aria-live="polite" aria-atomic="true">
          <div className="ui-toast ui-toast--success" role="status">
            {toastMessage}
          </div>
        </div>
      ) : null}

      <Card
        title="Enterprises"
        className="user-management-card"
        action={
          <div className="ui-row enterprise-management__actions">
            <FormField
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="enterprise-management__search"
              placeholder="Search by enterprise name, code, or account breakdown"
              aria-label="Search enterprises"
            />
            <Button
              type="button"
              className="enterprise-management__create-trigger"
              onClick={() => setCreateModalOpen(true)}
            >
              Create
            </Button>
          </div>
        }
      >
        {message && status === "error" ? (
          <div className="status-alert status-alert--error status-alert--spaced">
            <span>{message}</span>
          </div>
        ) : null}

        <div className="user-management__toolbar">
          <span className="ui-note ui-note--muted">
            {enterpriseTableStatus === "loading" && enterpriseTotal === 0
              ? "Loading enterprises..."
              : enterpriseTotal === 0
                ? "Showing 0 enterprises."
                : `Showing ${enterpriseStart}-${enterpriseEnd} of ${enterpriseTotal} enterprise${
                    enterpriseTotal === 1 ? "" : "s"
                  }.`}
          </span>
        </div>

        {rows.length > 0 ? (
          <>
            <Table
              headers={["Enterprise", "Accounts", "Workspace", "Created", "Manage accounts and delete"]}
              rows={rows}
              className="enterprise-management__table"
              rowClassName="enterprise-management__row"
              columnTemplate="var(--enterprise-management-columns)"
            />
            {enterpriseTotalPages > 1 ? (
              <div className="user-management__pagination" aria-label="Enterprise pagination">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(effectiveEnterpriseTotalPages, prev + 1))}
                  disabled={currentPage === effectiveEnterpriseTotalPages}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="ui-empty-state">
            <p>
              {enterpriseTableStatus === "loading"
                ? "Loading enterprises..."
                : normalizeSearchQuery(searchQuery)
                  ? `No enterprises match "${searchQuery.trim()}".`
                  : "No enterprises found."}
            </p>
          </div>
        )}
      </Card>

      <EnterpriseCreateModal
        open={createModalOpen}
        nameInput={nameInput}
        codeInput={codeInput}
        isCreating={isCreating}
        onNameInputChange={setNameInput}
        onCodeInputChange={setCodeInput}
        onClose={closeCreateModal}
        onSubmit={handleCreateEnterprise}
      />

      <EnterpriseAccountsModal
        enterprise={selectedEnterprise}
        usersStatus={enterpriseUsersStatus}
        usersMessage={enterpriseUsersMessage}
        userSearchQuery={enterpriseUserSearchQuery}
        onUserSearchQueryChange={setEnterpriseUserSearchQuery}
        userRows={enterpriseUserRows}
        userTotal={enterpriseUserTotal}
        userStart={enterpriseUserStart}
        userEnd={enterpriseUserEnd}
        userPage={enterpriseUserPage}
        userPageInput={enterpriseUserPageInput}
        userTotalPages={enterpriseUserTotalPages}
        effectiveUserTotalPages={effectiveEnterpriseUserTotalPages}
        onClose={() => setSelectedEnterprise(null)}
        onUserPageChange={setEnterpriseUserPage}
        onUserPageInputChange={setEnterpriseUserPageInput}
        onUserPageInputBlur={() => applyEnterpriseUserPageInput(enterpriseUserPageInput)}
        onUserPageJump={handleEnterpriseUserPageJump}
      />

      <ConfirmationModal
        open={pendingDeleteEnterprise !== null}
        title="Delete enterprise?"
        message={
          pendingDeleteEnterprise
            ? `Delete enterprise "${pendingDeleteEnterprise.name}"? This action cannot be undone.`
            : ""
        }
        cancelLabel="Cancel"
        confirmLabel="Delete enterprise"
        confirmVariant="danger"
        busy={pendingDeleteEnterprise ? deleteState[pendingDeleteEnterprise.id] === true : false}
        onCancel={() => setPendingDeleteEnterprise(null)}
        onConfirm={() => void handleDeleteEnterprise()}
      />
    </>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
