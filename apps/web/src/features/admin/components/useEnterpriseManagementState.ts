import { normalizeSearchQuery } from "@/shared/lib/search";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createEnterprise, deleteEnterprise, searchEnterprises } from "../api/client";
import type { EnterpriseRecord } from "../types";
import { useEnterpriseUserManagementState } from "./useEnterpriseUserManagementState";

type RequestState = "idle" | "loading" | "success" | "error";

const ENTERPRISES_PER_PAGE = 8;

type EnterpriseSearchResponse = Awaited<ReturnType<typeof searchEnterprises>>;

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

  const showSuccessToast = useCallback((nextMessage: string) => {
    setToastMessage(nextMessage);
  }, []);

  const userState = useEnterpriseUserManagementState({ showSuccessToast });
  const { clearSelectedEnterpriseIfDeleted } = userState;

  const normalizedEnterpriseSearch = normalizeSearchQuery(searchQuery);
  const effectiveEnterpriseTotalPages = Math.max(1, enterpriseTotalPages);

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
      const applied = applyEnterpriseResponse(response, {
        setCurrentPage,
        setEnterprises,
        setEnterpriseTotal,
        setEnterpriseTotalPages,
        setEnterpriseTableStatus,
      });
      if (!applied) return;
    } catch (err) {
      if (latestEnterpriseRequestId.current !== requestId) return;
      clearEnterpriseResults({
        setEnterprises,
        setEnterpriseTotal,
        setEnterpriseTotalPages,
        setEnterpriseTableStatus,
      });
      setStatus("error");
      setMessage(resolveUnknownError(err, "Could not load enterprises."));
    }
  }, []);

  const handleCreateEnterprise = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = nameInput.trim();
    const code = codeInput.trim().toUpperCase();
    const validationError = validateEnterpriseCreateInput(name);
    if (validationError) {
      setStatus("error");
      setMessage(validationError);
      return;
    }

    setIsCreating(true);
    setMessage(null);
    try {
      const created = await createEnterprise({ name, ...(code ? { code } : {}) });
      setStatus("success");
      showSuccessToast(`Enterprise "${created.name}" created with code ${created.code}.`);
      resetCreateModal({
        setNameInput,
        setCodeInput,
        setCreateModalOpen,
      });
      setCurrentPage(1);
      void loadEnterprises(searchQuery, 1);
    } catch (err) {
      setStatus("error");
      setMessage(resolveUnknownError(err, "Could not create enterprise."));
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
      clearSelectedEnterpriseIfDeleted(enterprise.id);
      void loadEnterprises(searchQuery, currentPage);
    } catch (err) {
      setStatus("error");
      setMessage(resolveUnknownError(err, "Could not delete enterprise."));
    } finally {
      setDeleteState((prev) => ({ ...prev, [enterprise.id]: false }));
    }
  }, [clearSelectedEnterpriseIfDeleted, currentPage, loadEnterprises, pendingDeleteEnterprise, searchQuery, showSuccessToast]);

  const applyPageInput = useCallback((value: string) => {
    const parsedPage = Number(value);
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || parsedPage > effectiveEnterpriseTotalPages) {
      setPageInput(String(currentPage));
      return;
    }
    setCurrentPage(parsedPage);
  }, [currentPage, effectiveEnterpriseTotalPages]);

  const handlePageJump = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyPageInput(pageInput);
  }, [applyPageInput, pageInput]);

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

  const enterpriseStart = enterpriseTotal === 0 ? 0 : (currentPage - 1) * ENTERPRISES_PER_PAGE + 1;
  const enterpriseEnd = getEnterpriseListEnd({
    enterpriseTotal,
    currentPage,
    visibleCount: enterprises.length,
  });

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
    handlePageJump,
    applyPageInput,
    ...userState,
  };
}

function applyEnterpriseResponse(
  response: EnterpriseSearchResponse,
  setters: {
    setCurrentPage: (value: number) => void;
    setEnterprises: (value: EnterpriseRecord[]) => void;
    setEnterpriseTotal: (value: number) => void;
    setEnterpriseTotalPages: (value: number) => void;
    setEnterpriseTableStatus: (value: RequestState) => void;
  }
): boolean {
  if (response.totalPages > 0 && response.page > response.totalPages) {
    setters.setCurrentPage(response.totalPages);
    return false;
  }

  setters.setEnterprises(response.items);
  setters.setEnterpriseTotal(response.total);
  setters.setEnterpriseTotalPages(response.totalPages);
  setters.setEnterpriseTableStatus("success");
  return true;
}

function clearEnterpriseResults(setters: {
  setEnterprises: (value: EnterpriseRecord[]) => void;
  setEnterpriseTotal: (value: number) => void;
  setEnterpriseTotalPages: (value: number) => void;
  setEnterpriseTableStatus: (value: RequestState) => void;
}) {
  setters.setEnterprises([]);
  setters.setEnterpriseTotal(0);
  setters.setEnterpriseTotalPages(0);
  setters.setEnterpriseTableStatus("error");
}

function validateEnterpriseCreateInput(name: string): string | null {
  if (!name) return "Enterprise name is required.";
  return null;
}

function resetCreateModal(setters: {
  setNameInput: (value: string) => void;
  setCodeInput: (value: string) => void;
  setCreateModalOpen: (value: boolean) => void;
}) {
  setters.setNameInput("");
  setters.setCodeInput("");
  setters.setCreateModalOpen(false);
}

function resolveUnknownError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

function getEnterpriseListEnd(params: { enterpriseTotal: number; currentPage: number; visibleCount: number }): number {
  if (params.enterpriseTotal === 0) return 0;
  const rangeEnd = (params.currentPage - 1) * ENTERPRISES_PER_PAGE + params.visibleCount;
  return Math.min(rangeEnd, params.enterpriseTotal);
}
