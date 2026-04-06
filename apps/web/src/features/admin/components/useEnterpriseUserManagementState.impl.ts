import { normalizeSearchQuery } from "@/shared/lib/search";
import { useRef, useState } from "react";
import { getEffectiveTotalPages, getPaginationEnd, getPaginationStart } from "@/shared/lib/pagination";
import type { AdminUser, EnterpriseRecord } from "../types";
import {
  ENTERPRISE_USERS_PER_PAGE,
  type EnterpriseUserActions,
  type RequestState,
  useEnterpriseUserActions,
  useEnterpriseUserEffects,
  useEnterpriseUserLoaders,
} from "./useEnterpriseUserManagementState.helpers";

type UseEnterpriseUserManagementStateArgs = {
  showSuccessToast: (message: string) => void;
};

type EnterpriseUserState = ReturnType<typeof useEnterpriseUserState>;

export function useEnterpriseUserManagementState({ showSuccessToast }: UseEnterpriseUserManagementStateArgs) {
  const state = useEnterpriseUserState();
  const loaders = useEnterpriseUserLoaders({
    latestEnterpriseUsersRequestRef: state.latestEnterpriseUsersRequestRef,
    setEnterpriseUsers: state.setEnterpriseUsers,
    setEnterpriseUsersMessage: state.setEnterpriseUsersMessage,
    setEnterpriseUsersStatus: state.setEnterpriseUsersStatus,
    setEnterpriseUserTotal: state.setEnterpriseUserTotal,
    setEnterpriseUserTotalPages: state.setEnterpriseUserTotalPages,
    setEnterpriseUserPage: state.setEnterpriseUserPage,
  });
  const userActions = useEnterpriseUserActions({
    selectedEnterprise: state.selectedEnterprise,
    enterpriseUsers: state.enterpriseUsers,
    enterpriseUserSearchQuery: state.enterpriseUserSearchQuery,
    enterpriseUserPage: state.enterpriseUserPage,
    enterpriseUserPageInput: state.enterpriseUserPageInput,
    effectiveEnterpriseUserTotalPages: state.effectiveEnterpriseUserTotalPages,
    setSelectedEnterprise: state.setSelectedEnterprise,
    setEnterpriseUsers: state.setEnterpriseUsers,
    setEnterpriseUsersStatus: state.setEnterpriseUsersStatus,
    setEnterpriseUsersMessage: state.setEnterpriseUsersMessage,
    setEnterpriseUserActionState: state.setEnterpriseUserActionState,
    setEnterpriseUserSearchQuery: state.setEnterpriseUserSearchQuery,
    setEnterpriseUserPage: state.setEnterpriseUserPage,
    setEnterpriseUserPageInput: state.setEnterpriseUserPageInput,
    setEnterpriseUserTotal: state.setEnterpriseUserTotal,
    setEnterpriseUserTotalPages: state.setEnterpriseUserTotalPages,
    loadEnterpriseUsers: loaders.loadEnterpriseUsers,
    showSuccessToast,
  });

  useEnterpriseUserEffects({
    selectedEnterprise: state.selectedEnterprise,
    enterpriseUserSearchQuery: state.enterpriseUserSearchQuery,
    enterpriseUserPage: state.enterpriseUserPage,
    normalizedEnterpriseUserSearch: state.normalizedEnterpriseUserSearch,
    setEnterpriseUserPage: state.setEnterpriseUserPage,
    setEnterpriseUserPageInput: state.setEnterpriseUserPageInput,
    loadEnterpriseUsers: loaders.loadEnterpriseUsers,
  });

  return buildEnterpriseUserManagementResult({
    state,
    userActions,
  });
}

function useEnterpriseUserState() {
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
  const latestEnterpriseUsersRequestRef = useRef(0);

  return {
    selectedEnterprise,
    setSelectedEnterprise,
    enterpriseUsers,
    setEnterpriseUsers,
    enterpriseUsersStatus,
    setEnterpriseUsersStatus,
    enterpriseUsersMessage,
    setEnterpriseUsersMessage,
    enterpriseUserActionState,
    setEnterpriseUserActionState,
    enterpriseUserSearchQuery,
    setEnterpriseUserSearchQuery,
    enterpriseUserPage,
    setEnterpriseUserPage,
    enterpriseUserPageInput,
    setEnterpriseUserPageInput,
    enterpriseUserTotal,
    setEnterpriseUserTotal,
    enterpriseUserTotalPages,
    setEnterpriseUserTotalPages,
    normalizedEnterpriseUserSearch: normalizeSearchQuery(enterpriseUserSearchQuery),
    effectiveEnterpriseUserTotalPages: getEffectiveTotalPages(enterpriseUserTotalPages),
    enterpriseUserStart: getPaginationStart(enterpriseUserTotal, enterpriseUserPage, ENTERPRISE_USERS_PER_PAGE),
    enterpriseUserEnd: getPaginationEnd(
      enterpriseUserTotal,
      enterpriseUserPage,
      ENTERPRISE_USERS_PER_PAGE,
      enterpriseUsers.length,
    ),
    latestEnterpriseUsersRequestRef,
  };
}

function buildEnterpriseUserManagementResult(options: {
  state: EnterpriseUserState;
  userActions: EnterpriseUserActions;
}) {
  const stateFields = {
    selectedEnterprise: options.state.selectedEnterprise,
    setSelectedEnterprise: options.state.setSelectedEnterprise,
    enterpriseUsers: options.state.enterpriseUsers,
    enterpriseUsersStatus: options.state.enterpriseUsersStatus,
    enterpriseUsersMessage: options.state.enterpriseUsersMessage,
    enterpriseUserActionState: options.state.enterpriseUserActionState,
    enterpriseUserSearchQuery: options.state.enterpriseUserSearchQuery,
    setEnterpriseUserSearchQuery: options.state.setEnterpriseUserSearchQuery,
  };
  const pagingFields = {
    enterpriseUserPage: options.state.enterpriseUserPage,
    setEnterpriseUserPage: options.state.setEnterpriseUserPage,
    enterpriseUserPageInput: options.state.enterpriseUserPageInput,
    setEnterpriseUserPageInput: options.state.setEnterpriseUserPageInput,
    enterpriseUserTotal: options.state.enterpriseUserTotal,
    enterpriseUserTotalPages: options.state.enterpriseUserTotalPages,
    effectiveEnterpriseUserTotalPages: options.state.effectiveEnterpriseUserTotalPages,
    enterpriseUserStart: options.state.enterpriseUserStart,
    enterpriseUserEnd: options.state.enterpriseUserEnd,
  };

  return {
    ...stateFields,
    ...pagingFields,
    ...options.userActions,
  };
}
