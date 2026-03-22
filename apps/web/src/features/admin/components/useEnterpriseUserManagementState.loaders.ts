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

function beginEnterpriseUsersLoad(
  setEnterpriseUsersStatus: Dispatch<SetStateAction<RequestState>>,
  setEnterpriseUsersMessage: Dispatch<SetStateAction<string | null>>,
) {
  setEnterpriseUsersStatus("loading");
  setEnterpriseUsersMessage(null);
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
  if (response.total === 0) setEnterpriseUsersMessage("No user accounts found in this enterprise.");
}

function applyEnterpriseUsersLoadError(options: {
  err: unknown;
  setEnterpriseUsers: Dispatch<SetStateAction<AdminUser[]>>;
  setEnterpriseUsersMessage: Dispatch<SetStateAction<string | null>>;
  setEnterpriseUsersStatus: Dispatch<SetStateAction<RequestState>>;
  setEnterpriseUserTotal: Dispatch<SetStateAction<number>>;
  setEnterpriseUserTotalPages: Dispatch<SetStateAction<number>>;
}) {
  const {
    err,
    setEnterpriseUsers,
    setEnterpriseUsersMessage,
    setEnterpriseUsersStatus,
    setEnterpriseUserTotal,
    setEnterpriseUserTotalPages,
  } = options;

  setEnterpriseUsers([]);
  setEnterpriseUserTotal(0);
  setEnterpriseUserTotalPages(0);
  setEnterpriseUsersStatus("error");
  setEnterpriseUsersMessage(resolveUnknownError(err, "Could not load enterprise users."));
}

async function loadEnterpriseUsersPage(options: EnterpriseUserLoadersOptions & {
  enterpriseId: string;
  query: string;
  page: number;
  requestId: number;
}) {
  beginEnterpriseUsersLoad(options.setEnterpriseUsersStatus, options.setEnterpriseUsersMessage);

  try {
    const response = await searchEnterpriseUsers(options.enterpriseId, {
      q: options.query.trim() || undefined,
      page: options.page,
      pageSize: ENTERPRISE_USERS_PER_PAGE,
    });
    if (options.latestEnterpriseUsersRequestRef.current !== options.requestId) return;
    applyEnterpriseUsersLoadResponse({
      response,
      setEnterpriseUsers: options.setEnterpriseUsers,
      setEnterpriseUsersMessage: options.setEnterpriseUsersMessage,
      setEnterpriseUsersStatus: options.setEnterpriseUsersStatus,
      setEnterpriseUserTotal: options.setEnterpriseUserTotal,
      setEnterpriseUserTotalPages: options.setEnterpriseUserTotalPages,
      setEnterpriseUserPage: options.setEnterpriseUserPage,
    });
  } catch (err) {
    if (options.latestEnterpriseUsersRequestRef.current !== options.requestId) return;
    applyEnterpriseUsersLoadError({
      err,
      setEnterpriseUsers: options.setEnterpriseUsers,
      setEnterpriseUsersMessage: options.setEnterpriseUsersMessage,
      setEnterpriseUsersStatus: options.setEnterpriseUsersStatus,
      setEnterpriseUserTotal: options.setEnterpriseUserTotal,
      setEnterpriseUserTotalPages: options.setEnterpriseUserTotalPages,
    });
  }
}

export function useEnterpriseUserLoaders(options: EnterpriseUserLoadersOptions): EnterpriseUserLoaders {
  const {
    latestEnterpriseUsersRequestRef,
    setEnterpriseUsers,
    setEnterpriseUsersMessage,
    setEnterpriseUsersStatus,
    setEnterpriseUserTotal,
    setEnterpriseUserTotalPages,
    setEnterpriseUserPage,
  } = options;

  const loadEnterpriseUsers = useCallback(async (enterpriseId: string, query: string, page: number) => {
    const requestId = latestEnterpriseUsersRequestRef.current + 1;
    latestEnterpriseUsersRequestRef.current = requestId;
    await loadEnterpriseUsersPage({
      latestEnterpriseUsersRequestRef,
      setEnterpriseUsers,
      setEnterpriseUsersMessage,
      setEnterpriseUsersStatus,
      setEnterpriseUserTotal,
      setEnterpriseUserTotalPages,
      setEnterpriseUserPage,
      enterpriseId,
      query,
      page,
      requestId,
    });
  }, [
    latestEnterpriseUsersRequestRef,
    setEnterpriseUserPage,
    setEnterpriseUserTotal,
    setEnterpriseUserTotalPages,
    setEnterpriseUsers,
    setEnterpriseUsersMessage,
    setEnterpriseUsersStatus,
  ]);

  return { loadEnterpriseUsers };
}
