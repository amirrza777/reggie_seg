import { useCallback, useEffect, useRef, useState, type Dispatch, type FormEvent, type MutableRefObject, type SetStateAction } from "react";
import { getEffectiveTotalPages, getPaginationEnd, getPaginationStart, parsePageInput } from "@/shared/lib/pagination";
import { normalizeSearchQuery } from "@/shared/lib/search";
import { createEnterprise, deleteEnterprise, searchEnterprises } from "../api/client";
import type { EnterpriseRecord } from "../types";
import { useEnterpriseUserManagementState } from "./useEnterpriseUserManagementState";

type RequestState = "idle" | "loading" | "success" | "error";

const ENTERPRISES_PER_PAGE = 8;

type EnterpriseSearchResponse = Awaited<ReturnType<typeof searchEnterprises>>;

type EnterpriseSearchSetters = {
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setEnterprises: Dispatch<SetStateAction<EnterpriseRecord[]>>;
  setEnterpriseTotal: Dispatch<SetStateAction<number>>;
  setEnterpriseTotalPages: Dispatch<SetStateAction<number>>;
  setEnterpriseTableStatus: Dispatch<SetStateAction<RequestState>>;
  setStatus: Dispatch<SetStateAction<RequestState>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
};

type EnterpriseCreateSetters = {
  setNameInput: Dispatch<SetStateAction<string>>;
  setCodeInput: Dispatch<SetStateAction<string>>;
  setCreateModalOpen: Dispatch<SetStateAction<boolean>>;
};

type EnterpriseStore = ReturnType<typeof useEnterpriseManagementStore>;

type EnterpriseDerivedState = {
  normalizedEnterpriseSearch: string;
  effectiveEnterpriseTotalPages: number;
  enterpriseStart: number;
  enterpriseEnd: number;
};

type EnterpriseCreateActionOptions = {
  nameInput: string;
  codeInput: string;
  searchQuery: string;
  setStatus: Dispatch<SetStateAction<RequestState>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
  setIsCreating: Dispatch<SetStateAction<boolean>>;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setNameInput: Dispatch<SetStateAction<string>>;
  setCodeInput: Dispatch<SetStateAction<string>>;
  setCreateModalOpen: Dispatch<SetStateAction<boolean>>;
  loadEnterprises: (query: string, page: number) => Promise<void>;
  showSuccessToast: (message: string) => void;
};

type EnterpriseDeleteActionOptions = {
  pendingDeleteEnterprise: EnterpriseRecord | null;
  setPendingDeleteEnterprise: Dispatch<SetStateAction<EnterpriseRecord | null>>;
  setDeleteState: Dispatch<SetStateAction<Record<string, boolean>>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
  setStatus: Dispatch<SetStateAction<RequestState>>;
  clearSelectedEnterpriseIfDeleted: (enterpriseId: string) => void;
  searchQuery: string;
  currentPage: number;
  loadEnterprises: (query: string, page: number) => Promise<void>;
  showSuccessToast: (message: string) => void;
};

function resolveUnknownError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function validateEnterpriseCreateInput(name: string): string | null {
  return name ? null : "Enterprise name is required.";
}

function resetCreateModal(setters: EnterpriseCreateSetters) {
  setters.setNameInput("");
  setters.setCodeInput("");
  setters.setCreateModalOpen(false);
}

function clearEnterpriseResults(setters: Pick<EnterpriseSearchSetters, "setEnterprises" | "setEnterpriseTotal" | "setEnterpriseTotalPages" | "setEnterpriseTableStatus">) {
  setters.setEnterprises([]);
  setters.setEnterpriseTotal(0);
  setters.setEnterpriseTotalPages(0);
  setters.setEnterpriseTableStatus("error");
}

function applyEnterpriseResponse(response: EnterpriseSearchResponse, setters: Pick<EnterpriseSearchSetters, "setCurrentPage" | "setEnterprises" | "setEnterpriseTotal" | "setEnterpriseTotalPages" | "setEnterpriseTableStatus">): boolean {
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

function getEnterpriseListEnd(params: { enterpriseTotal: number; currentPage: number; visibleCount: number }): number {
  return getPaginationEnd(params.enterpriseTotal, params.currentPage, ENTERPRISES_PER_PAGE, params.visibleCount);
}

function useEnterpriseManagementStore() {
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
  const latestEnterpriseRequestIdRef = useRef(0);
  const [nameInput, setNameInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<Record<string, boolean>>({});
  const [pendingDeleteEnterprise, setPendingDeleteEnterprise] = useState<EnterpriseRecord | null>(null);
  return { enterprises, status, enterpriseTableStatus, message, toastMessage, searchQuery, currentPage, pageInput, enterpriseTotal, enterpriseTotalPages, latestEnterpriseRequestIdRef, nameInput, codeInput, isCreating, createModalOpen, deleteState, pendingDeleteEnterprise, setEnterprises, setStatus, setEnterpriseTableStatus, setMessage, setToastMessage, setSearchQuery, setCurrentPage, setPageInput, setEnterpriseTotal, setEnterpriseTotalPages, setNameInput, setCodeInput, setIsCreating, setCreateModalOpen, setDeleteState, setPendingDeleteEnterprise };
}

function shouldIgnoreEnterpriseRequest(latestEnterpriseRequestIdRef: MutableRefObject<number>, requestId: number) {
  return latestEnterpriseRequestIdRef.current !== requestId;
}

function buildEnterpriseSearchParams(query: string, page: number) {
  return { q: query.trim() || undefined, page, pageSize: ENTERPRISES_PER_PAGE };
}

async function runLoadEnterprisesRequest(options: {
  query: string;
  page: number;
  requestId: number;
  latestEnterpriseRequestIdRef: MutableRefObject<number>;
  setters: EnterpriseSearchSetters;
}) {
  options.setters.setEnterpriseTableStatus("loading");
  try {
    const response = await searchEnterprises(buildEnterpriseSearchParams(options.query, options.page));
    if (shouldIgnoreEnterpriseRequest(options.latestEnterpriseRequestIdRef, options.requestId)) {
      return;
    }
    applyEnterpriseResponse(response, options.setters);
  } catch (err) {
    if (shouldIgnoreEnterpriseRequest(options.latestEnterpriseRequestIdRef, options.requestId)) {
      return;
    }
    clearEnterpriseResults(options.setters);
    options.setters.setStatus("error");
    options.setters.setMessage(resolveUnknownError(err, "Could not load enterprises."));
  }
}

function useLoadEnterprises(options: {
  latestEnterpriseRequestIdRef: MutableRefObject<number>;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setEnterprises: Dispatch<SetStateAction<EnterpriseRecord[]>>;
  setEnterpriseTotal: Dispatch<SetStateAction<number>>;
  setEnterpriseTotalPages: Dispatch<SetStateAction<number>>;
  setEnterpriseTableStatus: Dispatch<SetStateAction<RequestState>>;
  setStatus: Dispatch<SetStateAction<RequestState>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
}) {
  const latestEnterpriseRequestIdRef = options.latestEnterpriseRequestIdRef;
  const setCurrentPage = options.setCurrentPage;
  const setEnterprises = options.setEnterprises;
  const setEnterpriseTotal = options.setEnterpriseTotal;
  const setEnterpriseTotalPages = options.setEnterpriseTotalPages;
  const setEnterpriseTableStatus = options.setEnterpriseTableStatus;
  const setStatus = options.setStatus;
  const setMessage = options.setMessage;
  return useCallback(async (query: string, page: number) => {
    const setters = { setCurrentPage, setEnterprises, setEnterpriseTotal, setEnterpriseTotalPages, setEnterpriseTableStatus, setStatus, setMessage };
    const requestId = latestEnterpriseRequestIdRef.current + 1;
    latestEnterpriseRequestIdRef.current = requestId;
    await runLoadEnterprisesRequest({ query, page, requestId, latestEnterpriseRequestIdRef, setters });
  }, [latestEnterpriseRequestIdRef, setCurrentPage, setEnterpriseTableStatus, setEnterpriseTotal, setEnterpriseTotalPages, setEnterprises, setMessage, setStatus]);
}

function useEnterpriseCreateAction(options: EnterpriseCreateActionOptions) {
  return useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = options.nameInput.trim();
    const code = options.codeInput.trim().toUpperCase();
    const validationError = validateEnterpriseCreateInput(name);
    if (validationError) {
      options.setStatus("error");
      options.setMessage(validationError);
      return;
    }
    options.setIsCreating(true);
    options.setMessage(null);
    try {
      const created = await createEnterprise({ name, ...(code ? { code } : {}) });
      options.setStatus("success");
      options.showSuccessToast(`Enterprise "${created.name}" created with code ${created.code}.`);
      resetCreateModal({ setNameInput: options.setNameInput, setCodeInput: options.setCodeInput, setCreateModalOpen: options.setCreateModalOpen });
      options.setCurrentPage(1);
      void options.loadEnterprises(options.searchQuery, 1);
    } catch (err) {
      options.setStatus("error");
      options.setMessage(resolveUnknownError(err, "Could not create enterprise."));
    } finally {
      options.setIsCreating(false);
    }
  }, [options]);
}

function beginEnterpriseDelete(options: {
  enterprise: EnterpriseRecord;
  setPendingDeleteEnterprise: Dispatch<SetStateAction<EnterpriseRecord | null>>;
  setDeleteState: Dispatch<SetStateAction<Record<string, boolean>>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
}) {
  options.setPendingDeleteEnterprise(null);
  options.setDeleteState((previous) => ({ ...previous, [options.enterprise.id]: true }));
  options.setMessage(null);
}

function finishEnterpriseDelete(setDeleteState: Dispatch<SetStateAction<Record<string, boolean>>>, enterpriseId: string) {
  setDeleteState((previous) => ({ ...previous, [enterpriseId]: false }));
}

function useEnterpriseDeleteAction(options: EnterpriseDeleteActionOptions) {
  return useCallback(async () => {
    if (!options.pendingDeleteEnterprise) {
      return;
    }
    const enterprise = options.pendingDeleteEnterprise;
    beginEnterpriseDelete({ enterprise, setPendingDeleteEnterprise: options.setPendingDeleteEnterprise, setDeleteState: options.setDeleteState, setMessage: options.setMessage });
    try {
      await deleteEnterprise(enterprise.id);
      options.setStatus("success");
      options.showSuccessToast(`Enterprise "${enterprise.name}" deleted.`);
      options.clearSelectedEnterpriseIfDeleted(enterprise.id);
      void options.loadEnterprises(options.searchQuery, options.currentPage);
    } catch (err) {
      options.setStatus("error");
      options.setMessage(resolveUnknownError(err, "Could not delete enterprise."));
    } finally {
      finishEnterpriseDelete(options.setDeleteState, enterprise.id);
    }
  }, [options]);
}

function applyEnterprisePageInput(options: {
  value: string;
  enterpriseTotalPages: number;
  currentPage: number;
  setPageInput: Dispatch<SetStateAction<string>>;
  setCurrentPage: Dispatch<SetStateAction<number>>;
}) {
  const parsedPage = parsePageInput(options.value, options.enterpriseTotalPages);
  if (parsedPage === null) {
    options.setPageInput(String(options.currentPage));
    return;
  }
  options.setCurrentPage(parsedPage);
}

function useEnterprisePageActions(options: {
  currentPage: number;
  enterpriseTotalPages: number;
  pageInput: string;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setPageInput: Dispatch<SetStateAction<string>>;
}) {
  const applyPageInput = useCallback((value: string) => {
    applyEnterprisePageInput({ value, enterpriseTotalPages: options.enterpriseTotalPages, currentPage: options.currentPage, setPageInput: options.setPageInput, setCurrentPage: options.setCurrentPage });
  }, [options]);
  const handlePageJump = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyPageInput(options.pageInput);
  }, [applyPageInput, options.pageInput]);
  return { applyPageInput, handlePageJump };
}

function useEnterpriseLoadEffect(isSuperAdmin: boolean, searchQuery: string, currentPage: number, loadEnterprises: (query: string, page: number) => Promise<void>) {
  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }
    void loadEnterprises(searchQuery, currentPage);
  }, [currentPage, isSuperAdmin, loadEnterprises, searchQuery]);
}

function useToastDismissEffect(toastMessage: string | null, setToastMessage: Dispatch<SetStateAction<string | null>>) {
  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => setToastMessage(null), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [setToastMessage, toastMessage]);
}

function useSearchResetEffect(normalizedEnterpriseSearch: string, setCurrentPage: Dispatch<SetStateAction<number>>) {
  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedEnterpriseSearch, setCurrentPage]);
}

function usePageInputSyncEffect(currentPage: number, setPageInput: Dispatch<SetStateAction<string>>) {
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage, setPageInput]);
}

function useEnterpriseDerivedState(store: EnterpriseStore): EnterpriseDerivedState {
  const normalizedEnterpriseSearch = normalizeSearchQuery(store.searchQuery);
  const effectiveEnterpriseTotalPages = getEffectiveTotalPages(store.enterpriseTotalPages);
  const enterpriseStart = getPaginationStart(store.enterpriseTotal, store.currentPage, ENTERPRISES_PER_PAGE);
  const enterpriseEnd = getEnterpriseListEnd({ enterpriseTotal: store.enterpriseTotal, currentPage: store.currentPage, visibleCount: store.enterprises.length });
  return { normalizedEnterpriseSearch, effectiveEnterpriseTotalPages, enterpriseStart, enterpriseEnd };
}

function useCloseCreateModal(setNameInput: Dispatch<SetStateAction<string>>, setCodeInput: Dispatch<SetStateAction<string>>, setCreateModalOpen: Dispatch<SetStateAction<boolean>>) {
  return useCallback(() => {
    resetCreateModal({ setNameInput, setCodeInput, setCreateModalOpen });
  }, [setCodeInput, setCreateModalOpen, setNameInput]);
}

function buildEnterpriseManagementResult(params: {
  store: EnterpriseStore;
  userState: ReturnType<typeof useEnterpriseUserManagementState>;
  derived: EnterpriseDerivedState;
  closeCreateModal: () => void;
  handleCreateEnterprise: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleDeleteEnterprise: () => Promise<void>;
  applyPageInput: (value: string) => void;
  handlePageJump: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return { status: params.store.status, enterpriseTableStatus: params.store.enterpriseTableStatus, message: params.store.message, toastMessage: params.store.toastMessage, searchQuery: params.store.searchQuery, setSearchQuery: params.store.setSearchQuery, enterprises: params.store.enterprises, currentPage: params.store.currentPage, setCurrentPage: params.store.setCurrentPage, pageInput: params.store.pageInput, setPageInput: params.store.setPageInput, enterpriseTotal: params.store.enterpriseTotal, enterpriseTotalPages: params.store.enterpriseTotalPages, effectiveEnterpriseTotalPages: params.derived.effectiveEnterpriseTotalPages, enterpriseStart: params.derived.enterpriseStart, enterpriseEnd: params.derived.enterpriseEnd, createModalOpen: params.store.createModalOpen, setCreateModalOpen: params.store.setCreateModalOpen, nameInput: params.store.nameInput, setNameInput: params.store.setNameInput, codeInput: params.store.codeInput, setCodeInput: params.store.setCodeInput, isCreating: params.store.isCreating, closeCreateModal: params.closeCreateModal, handleCreateEnterprise: params.handleCreateEnterprise, deleteState: params.store.deleteState, pendingDeleteEnterprise: params.store.pendingDeleteEnterprise, setPendingDeleteEnterprise: params.store.setPendingDeleteEnterprise, handleDeleteEnterprise: params.handleDeleteEnterprise, handlePageJump: params.handlePageJump, applyPageInput: params.applyPageInput, ...params.userState };
}

export function useEnterpriseManagementState(isSuperAdmin: boolean) {
  const store = useEnterpriseManagementStore();
  const setToastMessage = store.setToastMessage;
  const showSuccessToast = useCallback((nextMessage: string) => {
    setToastMessage(nextMessage);
  }, [setToastMessage]);
  const userState = useEnterpriseUserManagementState({ showSuccessToast });
  const loadEnterprises = useLoadEnterprises({ latestEnterpriseRequestIdRef: store.latestEnterpriseRequestIdRef, setCurrentPage: store.setCurrentPage, setEnterprises: store.setEnterprises, setEnterpriseTotal: store.setEnterpriseTotal, setEnterpriseTotalPages: store.setEnterpriseTotalPages, setEnterpriseTableStatus: store.setEnterpriseTableStatus, setStatus: store.setStatus, setMessage: store.setMessage });
  const closeCreateModal = useCloseCreateModal(store.setNameInput, store.setCodeInput, store.setCreateModalOpen);
  const handleCreateEnterprise = useEnterpriseCreateAction({ nameInput: store.nameInput, codeInput: store.codeInput, searchQuery: store.searchQuery, setStatus: store.setStatus, setMessage: store.setMessage, setIsCreating: store.setIsCreating, setCurrentPage: store.setCurrentPage, setNameInput: store.setNameInput, setCodeInput: store.setCodeInput, setCreateModalOpen: store.setCreateModalOpen, loadEnterprises, showSuccessToast });
  const handleDeleteEnterprise = useEnterpriseDeleteAction({ pendingDeleteEnterprise: store.pendingDeleteEnterprise, setPendingDeleteEnterprise: store.setPendingDeleteEnterprise, setDeleteState: store.setDeleteState, setMessage: store.setMessage, setStatus: store.setStatus, clearSelectedEnterpriseIfDeleted: userState.clearSelectedEnterpriseIfDeleted, searchQuery: store.searchQuery, currentPage: store.currentPage, loadEnterprises, showSuccessToast });
  const pageActions = useEnterprisePageActions({ currentPage: store.currentPage, enterpriseTotalPages: store.enterpriseTotalPages, pageInput: store.pageInput, setCurrentPage: store.setCurrentPage, setPageInput: store.setPageInput });
  const derived = useEnterpriseDerivedState(store);
  useEnterpriseLoadEffect(isSuperAdmin, store.searchQuery, store.currentPage, loadEnterprises);
  useToastDismissEffect(store.toastMessage, store.setToastMessage);
  useSearchResetEffect(derived.normalizedEnterpriseSearch, store.setCurrentPage);
  usePageInputSyncEffect(store.currentPage, store.setPageInput);
  return buildEnterpriseManagementResult({ store, userState, derived, closeCreateModal, handleCreateEnterprise, handleDeleteEnterprise, applyPageInput: pageActions.applyPageInput, handlePageJump: pageActions.handlePageJump });
}
