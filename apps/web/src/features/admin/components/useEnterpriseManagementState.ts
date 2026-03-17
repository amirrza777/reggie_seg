import { normalizeSearchQuery } from "@/shared/lib/search";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  createEnterprise,
  deleteEnterprise,
  searchEnterpriseUsers,
  searchEnterprises,
  updateEnterpriseUser,
} from "../api/client";
import type { AdminUser, AdminUserRecord, EnterpriseRecord, UserRole } from "../types";

type RequestState = "idle" | "loading" | "success" | "error";

const ENTERPRISES_PER_PAGE = 8;
const ENTERPRISE_USERS_PER_PAGE = 10;

const normalizeUser = (user: AdminUserRecord): AdminUser => ({
  ...user,
  role: user.role ?? (user.isStaff ? "STAFF" : "STUDENT"),
  active: user.active ?? true,
});

export function useEnterpriseManagementState(isSuperAdmin: boolean) {
  const [enterprises, setEnterprises] = useState<EnterpriseRecord[]>([]);
  const [status, setStatus] = useState<RequestState>("idle");
  const [enterpriseTableStatus, setEnterpriseTableStatus] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [enterpriseTotal, setEnterpriseTotal] = useState(0);
  const [enterpriseTotalPages, setEnterpriseTotalPages] = useState(0);
  const latestEnterpriseRequestId = useRef(0);

  const [nameInput, setNameInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<Record<string, boolean>>({});
  const [pendingDeleteEnterprise, setPendingDeleteEnterprise] = useState<EnterpriseRecord | null>(null);

  const [selectedEnterprise, setSelectedEnterprise] = useState<EnterpriseRecord | null>(null);
  const [enterpriseUsers, setEnterpriseUsers] = useState<AdminUser[]>([]);
  const [enterpriseUsersStatus, setEnterpriseUsersStatus] = useState<RequestState>("idle");
  const [enterpriseUsersMessage, setEnterpriseUsersMessage] = useState<string | null>(null);
  const [enterpriseUserActionState, setEnterpriseUserActionState] = useState<Record<number, RequestState>>({});
  const [enterpriseUserSearchQuery, setEnterpriseUserSearchQuery] = useState("");
  const [enterpriseUserPage, setEnterpriseUserPage] = useState(1);
  const [enterpriseUserPageInput, setEnterpriseUserPageInput] = useState("1");
  const [enterpriseUserTotal, setEnterpriseUserTotal] = useState(0);
  const [enterpriseUserTotalPages, setEnterpriseUserTotalPages] = useState(0);
  const latestEnterpriseUsersRequestId = useRef(0);

  const normalizedEnterpriseSearch = normalizeSearchQuery(searchQuery);
  const normalizedEnterpriseUserSearch = normalizeSearchQuery(enterpriseUserSearchQuery);
  const effectiveEnterpriseTotalPages = Math.max(1, enterpriseTotalPages);
  const effectiveEnterpriseUserTotalPages = Math.max(1, enterpriseUserTotalPages);

  const showSuccessToast = useCallback((nextMessage: string) => {
    setToastMessage(nextMessage);
  }, []);

  const loadEnterprises = useCallback(async (query: string, page: number) => {
    const requestId = latestEnterpriseRequestId.current + 1;
    latestEnterpriseRequestId.current = requestId;
    setEnterpriseTableStatus("loading");

    try {
      const response = await searchEnterprises({
        q: query.trim() || undefined,
        page,
        pageSize: ENTERPRISES_PER_PAGE,
      });
      if (latestEnterpriseRequestId.current !== requestId) return;

      if (response.totalPages > 0 && response.page > response.totalPages) {
        setCurrentPage(response.totalPages);
        return;
      }

      setEnterprises(response.items);
      setEnterpriseTotal(response.total);
      setEnterpriseTotalPages(response.totalPages);
      setEnterpriseTableStatus("success");
    } catch (err) {
      if (latestEnterpriseRequestId.current !== requestId) return;
      setEnterprises([]);
      setEnterpriseTotal(0);
      setEnterpriseTotalPages(0);
      setEnterpriseTableStatus("error");
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not load enterprises.");
    }
  }, []);

  const loadEnterpriseUsers = useCallback(async (enterpriseId: string, query: string, page: number) => {
    const requestId = latestEnterpriseUsersRequestId.current + 1;
    latestEnterpriseUsersRequestId.current = requestId;
    setEnterpriseUsersStatus("loading");
    setEnterpriseUsersMessage(null);

    try {
      const response = await searchEnterpriseUsers(enterpriseId, {
        q: query.trim() || undefined,
        page,
        pageSize: ENTERPRISE_USERS_PER_PAGE,
      });
      if (latestEnterpriseUsersRequestId.current !== requestId) return;

      if (response.totalPages > 0 && response.page > response.totalPages) {
        setEnterpriseUserPage(response.totalPages);
        return;
      }

      setEnterpriseUsers(response.items.map(normalizeUser));
      setEnterpriseUserTotal(response.total);
      setEnterpriseUserTotalPages(response.totalPages);
      setEnterpriseUsersStatus("success");
      if (response.total === 0) {
        setEnterpriseUsersMessage("No user accounts found in this enterprise.");
      }
    } catch (err) {
      if (latestEnterpriseUsersRequestId.current !== requestId) return;
      setEnterpriseUsers([]);
      setEnterpriseUserTotal(0);
      setEnterpriseUserTotalPages(0);
      setEnterpriseUsersStatus("error");
      setEnterpriseUsersMessage(err instanceof Error ? err.message : "Could not load enterprise users.");
    }
  }, []);

  const setEnterpriseUserRow = useCallback((userId: number, update: (user: AdminUser) => AdminUser) => {
    setEnterpriseUsers((prev) => prev.map((user) => (user.id === userId ? update(user) : user)));
  }, []);

  const handleCreateEnterprise = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nameInput.trim();
    const code = codeInput.trim().toUpperCase();
    if (!name) {
      setStatus("error");
      setMessage("Enterprise name is required.");
      return;
    }

    setIsCreating(true);
    setMessage(null);
    try {
      const created = await createEnterprise({ name, ...(code ? { code } : {}) });
      setStatus("success");
      showSuccessToast(`Enterprise "${created.name}" created with code ${created.code}.`);
      setNameInput("");
      setCodeInput("");
      setCreateModalOpen(false);
      setCurrentPage(1);
      void loadEnterprises(searchQuery, 1);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not create enterprise.");
    } finally {
      setIsCreating(false);
    }
  }, [codeInput, loadEnterprises, nameInput, searchQuery, showSuccessToast]);

  const handleDeleteEnterprise = useCallback(async () => {
    if (!pendingDeleteEnterprise) return;
    const enterprise = pendingDeleteEnterprise;
    setPendingDeleteEnterprise(null);
    setDeleteState((prev) => ({ ...prev, [enterprise.id]: true }));
    setMessage(null);
    try {
      await deleteEnterprise(enterprise.id);
      setStatus("success");
      showSuccessToast(`Enterprise "${enterprise.name}" deleted.`);
      if (selectedEnterprise?.id === enterprise.id) {
        setSelectedEnterprise(null);
        setEnterpriseUsers([]);
      }
      void loadEnterprises(searchQuery, currentPage);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not delete enterprise.");
    } finally {
      setDeleteState((prev) => ({ ...prev, [enterprise.id]: false }));
    }
  }, [currentPage, loadEnterprises, pendingDeleteEnterprise, searchQuery, selectedEnterprise?.id, showSuccessToast]);

  const openEnterpriseAccounts = useCallback((enterprise: EnterpriseRecord) => {
    setSelectedEnterprise(enterprise);
    setEnterpriseUsers([]);
    setEnterpriseUserTotal(0);
    setEnterpriseUserTotalPages(0);
    setEnterpriseUsersMessage(null);
    setEnterpriseUserSearchQuery("");
    setEnterpriseUserPage(1);
    setEnterpriseUserActionState({});
  }, []);

  const handleEnterpriseUserRoleChange = useCallback(async (userId: number, role: UserRole) => {
    if (!selectedEnterprise) return;
    const previous = enterpriseUsers.map((user) => ({ ...user }));
    setEnterpriseUserActionState((prev) => ({ ...prev, [userId]: "loading" }));
    setEnterpriseUsersMessage(null);
    setEnterpriseUserRow(userId, (user) => ({ ...user, role, isStaff: role !== "STUDENT" }));

    try {
      const updated = await updateEnterpriseUser(selectedEnterprise.id, userId, { role });
      setEnterpriseUserRow(userId, () => normalizeUser(updated));
      showSuccessToast(`Updated role to ${role.toLowerCase()}.`);
      void loadEnterpriseUsers(selectedEnterprise.id, enterpriseUserSearchQuery, enterpriseUserPage);
    } catch (err) {
      setEnterpriseUsers(previous);
      setEnterpriseUsersMessage(err instanceof Error ? err.message : "Could not update role.");
    } finally {
      setEnterpriseUserActionState((prev) => ({ ...prev, [userId]: "idle" }));
    }
  }, [enterpriseUserPage, enterpriseUserSearchQuery, enterpriseUsers, loadEnterpriseUsers, selectedEnterprise, setEnterpriseUserRow, showSuccessToast]);

  const handleEnterpriseUserStatusToggle = useCallback(async (userId: number, nextStatus: boolean) => {
    if (!selectedEnterprise) return;
    const previous = enterpriseUsers.map((user) => ({ ...user }));
    setEnterpriseUserActionState((prev) => ({ ...prev, [userId]: "loading" }));
    setEnterpriseUsersMessage(null);
    setEnterpriseUserRow(userId, (user) => ({ ...user, active: nextStatus }));

    try {
      const updated = await updateEnterpriseUser(selectedEnterprise.id, userId, { active: nextStatus });
      setEnterpriseUserRow(userId, () => normalizeUser(updated));
      showSuccessToast(nextStatus ? "Account activated." : "Account suspended.");
      void loadEnterpriseUsers(selectedEnterprise.id, enterpriseUserSearchQuery, enterpriseUserPage);
    } catch (err) {
      setEnterpriseUsers(previous);
      setEnterpriseUsersMessage(err instanceof Error ? err.message : "Could not update account status.");
    } finally {
      setEnterpriseUserActionState((prev) => ({ ...prev, [userId]: "idle" }));
    }
  }, [enterpriseUserPage, enterpriseUserSearchQuery, enterpriseUsers, loadEnterpriseUsers, selectedEnterprise, setEnterpriseUserRow, showSuccessToast]);

  const applyPageInput = useCallback((value: string) => {
    const parsedPage = Number(value);
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || parsedPage > effectiveEnterpriseTotalPages) {
      setPageInput(String(currentPage));
      return;
    }
    setCurrentPage(parsedPage);
  }, [currentPage, effectiveEnterpriseTotalPages]);

  const applyEnterpriseUserPageInput = useCallback((value: string) => {
    const parsedPage = Number(value);
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || parsedPage > effectiveEnterpriseUserTotalPages) {
      setEnterpriseUserPageInput(String(enterpriseUserPage));
      return;
    }
    setEnterpriseUserPage(parsedPage);
  }, [effectiveEnterpriseUserTotalPages, enterpriseUserPage]);

  const handlePageJump = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyPageInput(pageInput);
  }, [applyPageInput, pageInput]);

  const handleEnterpriseUserPageJump = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyEnterpriseUserPageInput(enterpriseUserPageInput);
  }, [applyEnterpriseUserPageInput, enterpriseUserPageInput]);

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    setNameInput("");
    setCodeInput("");
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void loadEnterprises(searchQuery, currentPage);
  }, [isSuperAdmin, searchQuery, currentPage, loadEnterprises]);

  useEffect(() => {
    if (!selectedEnterprise) return;
    void loadEnterpriseUsers(selectedEnterprise.id, enterpriseUserSearchQuery, enterpriseUserPage);
  }, [selectedEnterprise, enterpriseUserSearchQuery, enterpriseUserPage, loadEnterpriseUsers]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeoutId = window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedEnterpriseSearch]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    setEnterpriseUserPage(1);
  }, [normalizedEnterpriseUserSearch, selectedEnterprise?.id]);

  useEffect(() => {
    setEnterpriseUserPageInput(String(enterpriseUserPage));
  }, [enterpriseUserPage]);

  const enterpriseStart = enterpriseTotal === 0 ? 0 : (currentPage - 1) * ENTERPRISES_PER_PAGE + 1;
  const enterpriseEnd =
    enterpriseTotal === 0 ? 0 : Math.min((currentPage - 1) * ENTERPRISES_PER_PAGE + enterprises.length, enterpriseTotal);

  const enterpriseUserStart = enterpriseUserTotal === 0 ? 0 : (enterpriseUserPage - 1) * ENTERPRISE_USERS_PER_PAGE + 1;
  const enterpriseUserEnd =
    enterpriseUserTotal === 0
      ? 0
      : Math.min((enterpriseUserPage - 1) * ENTERPRISE_USERS_PER_PAGE + enterpriseUsers.length, enterpriseUserTotal);

  return {
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
  };
}
