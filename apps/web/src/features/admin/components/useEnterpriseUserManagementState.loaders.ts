import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { searchEnterpriseUsers } from "../api/client";
import type { AdminUser } from "../types";
import {
  ENTERPRISE_USERS_PER_PAGE,
  type EnterpriseUserLoaders,
  normalizeUser,
  type RequestState,
  resolveUnknownError,
} from "./useEnterpriseUserManagementState.shared";

type EnterpriseUsersSearchResponse = Awaited<ReturnType<typeof searchEnterpriseUsers>>;

type EnterpriseUserLoadersOptions = {
  latestEnterpriseUsersRequestRef: MutableRefObject<number>;
  setEnterpriseUsers: Dispatch<SetStateAction<AdminUser[]>>;
  setEnterpriseUsersMessage: Dispatch<SetStateAction<string | null>>;
  setEnterpriseUsersStatus: Dispatch<SetStateAction<RequestState>>;
  setEnterpriseUserTotal: Dispatch<SetStateAction<number>>;
  setEnterpriseUserTotalPages: Dispatch<SetStateAction<number>>;
  setEnterpriseUserPage: Dispatch<SetStateAction<number>>;
};

type EnterpriseUsersLoadPageOptions = EnterpriseUserLoadersOptions & {
  enterpriseId: string;
  query: string;
  page: number;
  requestId: number;
};

function beginEnterpriseUsersLoad(
  setEnterpriseUsersStatus: Dispatch<SetStateAction<RequestState>>,
  setEnterpriseUsersMessage: Dispatch<SetStateAction<string | null>>,
) {
  setEnterpriseUsersStatus("loading");
  setEnterpriseUsersMessage(null);
}

function isLatestEnterpriseUsersRequest(latestRequestRef: MutableRefObject<number>, requestId: number) {
  return latestRequestRef.current === requestId;
}

function applyEnterpriseUsersLoadResponse(options: {
  response: EnterpriseUsersSearchResponse;
  setEnterpriseUsers: Dispatch<SetStateAction<AdminUser[]>>;
  setEnterpriseUsersMessage: Dispatch<SetStateAction<string | null>>;
  setEnterpriseUsersStatus: Dispatch<SetStateAction<RequestState>>;
  setEnterpriseUserTotal: Dispatch<SetStateAction<number>>;
  setEnterpriseUserTotalPages: Dispatch<SetStateAction<number>>;
  setEnterpriseUserPage: Dispatch<SetStateAction<number>>;
}) {
  const {
    response,
    setEnterpriseUsers,
    setEnterpriseUsersMessage,
    setEnterpriseUsersStatus,
    setEnterpriseUserTotal,
    setEnterpriseUserTotalPages,
    setEnterpriseUserPage,
  } = options;
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
}

function applyEnterpriseUsersLoadError(options: {
  err: unknown;
  setEnterpriseUsers: Dispatch<SetStateAction<AdminUser[]>>;
  setEnterpriseUsersMessage: Dispatch<SetStateAction<string | null>>;
  setEnterpriseUsersStatus: Dispatch<SetStateAction<RequestState>>;
  setEnterpriseUserTotal: Dispatch<SetStateAction<number>>;
  setEnterpriseUserTotalPages: Dispatch<SetStateAction<number>>;
}) {
  options.setEnterpriseUsers([]);
  options.setEnterpriseUserTotal(0);
  options.setEnterpriseUserTotalPages(0);
  options.setEnterpriseUsersStatus("error");
  options.setEnterpriseUsersMessage(resolveUnknownError(options.err, "Could not load enterprise users."));
}

function runEnterpriseUsersLoadSuccess(options: EnterpriseUsersLoadPageOptions, response: EnterpriseUsersSearchResponse) {
  if (!isLatestEnterpriseUsersRequest(options.latestEnterpriseUsersRequestRef, options.requestId)) {
    return;
  }
  applyEnterpriseUsersLoadResponse({
    response,
    setEnterpriseUsers: options.setEnterpriseUsers,
    setEnterpriseUsersMessage: options.setEnterpriseUsersMessage,
    setEnterpriseUsersStatus: options.setEnterpriseUsersStatus,
    setEnterpriseUserTotal: options.setEnterpriseUserTotal,
    setEnterpriseUserTotalPages: options.setEnterpriseUserTotalPages,
    setEnterpriseUserPage: options.setEnterpriseUserPage,
  });
}

function runEnterpriseUsersLoadError(options: EnterpriseUsersLoadPageOptions, err: unknown) {
  if (!isLatestEnterpriseUsersRequest(options.latestEnterpriseUsersRequestRef, options.requestId)) {
    return;
  }
  applyEnterpriseUsersLoadError({
    err,
    setEnterpriseUsers: options.setEnterpriseUsers,
    setEnterpriseUsersMessage: options.setEnterpriseUsersMessage,
    setEnterpriseUsersStatus: options.setEnterpriseUsersStatus,
    setEnterpriseUserTotal: options.setEnterpriseUserTotal,
    setEnterpriseUserTotalPages: options.setEnterpriseUserTotalPages,
  });
}

async function loadEnterpriseUsersPage(options: EnterpriseUsersLoadPageOptions) {
  beginEnterpriseUsersLoad(options.setEnterpriseUsersStatus, options.setEnterpriseUsersMessage);
  try {
    const response = await searchEnterpriseUsers(options.enterpriseId, { q: options.query.trim() || undefined, page: options.page, pageSize: ENTERPRISE_USERS_PER_PAGE });
    runEnterpriseUsersLoadSuccess(options, response);
  } catch (err) {
    runEnterpriseUsersLoadError(options, err);
  }
}

function useLoadEnterpriseUsersCallback(options: EnterpriseUserLoadersOptions) {
  const latestEnterpriseUsersRequestRef = options.latestEnterpriseUsersRequestRef;
  const setEnterpriseUsers = options.setEnterpriseUsers;
  const setEnterpriseUsersMessage = options.setEnterpriseUsersMessage;
  const setEnterpriseUsersStatus = options.setEnterpriseUsersStatus;
  const setEnterpriseUserTotal = options.setEnterpriseUserTotal;
  const setEnterpriseUserTotalPages = options.setEnterpriseUserTotalPages;
  const setEnterpriseUserPage = options.setEnterpriseUserPage;
  return useCallback(async (enterpriseId: string, query: string, page: number) => {
    const requestId = latestEnterpriseUsersRequestRef.current + 1;
    latestEnterpriseUsersRequestRef.current = requestId;
    await loadEnterpriseUsersPage({ latestEnterpriseUsersRequestRef, setEnterpriseUsers, setEnterpriseUsersMessage, setEnterpriseUsersStatus, setEnterpriseUserTotal, setEnterpriseUserTotalPages, setEnterpriseUserPage, enterpriseId, query, page, requestId });
  }, [latestEnterpriseUsersRequestRef, setEnterpriseUserPage, setEnterpriseUserTotal, setEnterpriseUserTotalPages, setEnterpriseUsers, setEnterpriseUsersMessage, setEnterpriseUsersStatus]);
}

export function useEnterpriseUserLoaders(options: EnterpriseUserLoadersOptions): EnterpriseUserLoaders {
  const loadEnterpriseUsers = useLoadEnterpriseUsersCallback(options);
  return { loadEnterpriseUsers };
}
