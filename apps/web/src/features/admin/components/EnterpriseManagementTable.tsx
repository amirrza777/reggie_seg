"use client";

import { useCallback, useState } from "react";
import { ConfirmationModal } from "@/shared/ui/modal/ConfirmationModal";
import { EnterpriseAccountsModal } from "./EnterpriseAccountsModal";
import { EnterpriseCreateModal } from "./EnterpriseCreateModal";
import { EnterpriseManagementListCard } from "./EnterpriseManagementListCard";
import { buildEnterpriseRows, buildEnterpriseUserRows } from "./rows/enterpriseManagementRows";
import { useEnterpriseManagementState } from "./useEnterpriseManagementState";

type EnterpriseManagementTableProps = {
  isSuperAdmin: boolean;
};

type ManagementState = ReturnType<typeof useEnterpriseManagementState>;

type EnterpriseManagementTableBodyProps = {
  state: ManagementState;
  rows: ReturnType<typeof buildEnterpriseRows>;
  enterpriseUserRows: ReturnType<typeof buildEnterpriseUserRows>;
};

export function EnterpriseManagementTable({ isSuperAdmin }: EnterpriseManagementTableProps) {
  const state = useEnterpriseManagementState(isSuperAdmin);
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState<number | null>(null);

  const confirmRemoveUser = useCallback(() => {
    if (pendingRemoveUserId === null) return;
    const userId = pendingRemoveUserId;
    setPendingRemoveUserId(null);
    void state.handleEnterpriseUserStatusToggle(userId, false);
  }, [pendingRemoveUserId, state]);

  if (!isSuperAdmin) {
    return null;
  }

  const pendingRemoveUser = pendingRemoveUserId !== null
    ? state.enterpriseUsers.find((u) => u.id === pendingRemoveUserId) ?? null
    : null;

  const rows = buildEnterpriseRows({
    enterprises: state.enterprises,
    deleteState: state.deleteState,
    onOpenAccounts: state.openEnterpriseAccounts,
    onRequestDelete: state.setPendingDeleteEnterprise,
    formatDate,
  });

  const enterpriseUserRows = buildEnterpriseUserRows({
    users: state.enterpriseUsers,
    actionState: state.enterpriseUserActionState,
    onRoleChange: (userId, role) => {
      void state.handleEnterpriseUserRoleChange(userId, role);
    },
    onStatusToggle: (userId, nextStatus) => {
      void state.handleEnterpriseUserStatusToggle(userId, nextStatus);
    },
    onRequestRemoveUser: setPendingRemoveUserId,
  });

  return (
    <>
      <EnterpriseManagementTableBody state={state} rows={rows} enterpriseUserRows={enterpriseUserRows} />
      <ConfirmationModal
        open={pendingRemoveUser !== null}
        title="Remove user from enterprise"
        message={
          pendingRemoveUser
            ? `Remove "${pendingRemoveUser.email}" from this enterprise? Their access will be suspended.`
            : "Remove this user from enterprise access?"
        }
        confirmLabel="Remove user"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onCancel={() => setPendingRemoveUserId(null)}
        onConfirm={confirmRemoveUser}
      />
    </>
  );
}

function EnterpriseManagementTableBody({ state, rows, enterpriseUserRows }: EnterpriseManagementTableBodyProps) {
  return (
    <>
      <EnterpriseSuccessToast toastMessage={state.toastMessage} />
      <EnterpriseManagementListCard
        status={state.status}
        enterpriseTableStatus={state.enterpriseTableStatus}
        message={state.message}
        searchQuery={state.searchQuery}
        setSearchQuery={state.setSearchQuery}
        rows={rows}
        currentPage={state.currentPage}
        setCurrentPage={state.setCurrentPage}
        pageInput={state.pageInput}
        setPageInput={state.setPageInput}
        enterpriseTotal={state.enterpriseTotal}
        enterpriseTotalPages={state.enterpriseTotalPages}
        effectiveEnterpriseTotalPages={state.effectiveEnterpriseTotalPages}
        enterpriseStart={state.enterpriseStart}
        enterpriseEnd={state.enterpriseEnd}
        onOpenCreateModal={() => state.setCreateModalOpen(true)}
        handlePageJump={state.handlePageJump}
        applyPageInput={state.applyPageInput}
      />
      <EnterpriseManagementModals state={state} enterpriseUserRows={enterpriseUserRows} />
    </>
  );
}

function EnterpriseSuccessToast({ toastMessage }: { toastMessage: string | null }) {
  if (!toastMessage) {
    return null;
  }

  return (
    <div className="ui-toast-layer" aria-live="polite" aria-atomic="true">
      <div className="ui-toast ui-toast--success" role="status">
        {toastMessage}
      </div>
    </div>
  );
}

function EnterpriseCreateModalSection({ state }: { state: ManagementState }) {
  return (
    <EnterpriseCreateModal
      open={state.createModalOpen}
      nameInput={state.nameInput}
      codeInput={state.codeInput}
      inviteEmailInput={state.inviteEmailInput}
      isCreating={state.isCreating}
      onNameInputChange={state.setNameInput}
      onCodeInputChange={state.setCodeInput}
      onInviteEmailInputChange={state.setInviteEmailInput}
      onClose={state.closeCreateModal}
      onSubmit={state.handleCreateEnterprise}
    />
  );
}

function EnterpriseAccountsModalSection({
  state,
  enterpriseUserRows,
}: {
  state: ManagementState;
  enterpriseUserRows: ReturnType<typeof buildEnterpriseUserRows>;
}) {
  return (
    <EnterpriseAccountsModal
      enterprise={state.selectedEnterprise}
      usersStatus={state.enterpriseUsersStatus}
      usersMessage={state.enterpriseUsersMessage}
      inviteEmail={state.enterpriseAdminInviteEmail}
      onInviteEmailChange={state.setEnterpriseAdminInviteEmail}
      inviteStatus={state.enterpriseAdminInviteStatus}
      inviteMessage={state.enterpriseAdminInviteMessage}
      onInviteSubmit={(event) => {
        void state.submitEnterpriseAdminInvite(event);
      }}
      userSearchQuery={state.enterpriseUserSearchQuery}
      onUserSearchQueryChange={state.setEnterpriseUserSearchQuery}
      userSortValue={state.enterpriseUserSortValue}
      onUserSortValueChange={state.setEnterpriseUserSortValue}
      userRows={enterpriseUserRows}
      userTotal={state.enterpriseUserTotal}
      userStart={state.enterpriseUserStart}
      userEnd={state.enterpriseUserEnd}
      userPage={state.enterpriseUserPage}
      userPageInput={state.enterpriseUserPageInput}
      userTotalPages={state.enterpriseUserTotalPages}
      effectiveUserTotalPages={state.effectiveEnterpriseUserTotalPages}
      onClose={state.resetSelectedEnterprise}
      onUserPageChange={state.setEnterpriseUserPage}
      onUserPageInputChange={state.setEnterpriseUserPageInput}
      onUserPageInputBlur={() => state.applyEnterpriseUserPageInput(state.enterpriseUserPageInput)}
      onUserPageJump={state.handleEnterpriseUserPageJump}
    />
  );
}

function EnterpriseDeleteModalSection({ state }: { state: ManagementState }) {
  return (
    <ConfirmationModal
      open={state.pendingDeleteEnterprise !== null}
      title="Delete enterprise?"
      message={formatDeleteMessage(state.pendingDeleteEnterprise)}
      cancelLabel="Cancel"
      confirmLabel="Delete enterprise"
      confirmVariant="danger"
      busy={isDeleteBusy(state.pendingDeleteEnterprise, state.deleteState)}
      onCancel={() => state.setPendingDeleteEnterprise(null)}
      onConfirm={() => void state.handleDeleteEnterprise()}
    />
  );
}

function EnterpriseManagementModals({
  state,
  enterpriseUserRows,
}: {
  state: ManagementState;
  enterpriseUserRows: ReturnType<typeof buildEnterpriseUserRows>;
}) {
  return (
    <>
      <EnterpriseCreateModalSection state={state} />
      <EnterpriseAccountsModalSection state={state} enterpriseUserRows={enterpriseUserRows} />
      <EnterpriseDeleteModalSection state={state} />
    </>
  );
}

function formatDeleteMessage(pendingDeleteEnterprise: ManagementState["pendingDeleteEnterprise"]): string {
  if (!pendingDeleteEnterprise) {
    return "";
  }
  return `Delete enterprise "${pendingDeleteEnterprise.name}"? This action cannot be undone.`;
}

function isDeleteBusy(
  pendingDeleteEnterprise: ManagementState["pendingDeleteEnterprise"],
  deleteState: ManagementState["deleteState"]
): boolean {
  if (!pendingDeleteEnterprise) {
    return false;
  }
  return deleteState[pendingDeleteEnterprise.id] === true;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
