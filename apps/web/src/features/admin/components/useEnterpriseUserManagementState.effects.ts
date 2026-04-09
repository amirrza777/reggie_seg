import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { EnterpriseRecord } from "../types";
import type { EnterpriseUserLoaders, EnterpriseUserSortValue } from "./useEnterpriseUserManagementState.shared";

type EnterpriseUserEffectsOptions = {
  selectedEnterprise: EnterpriseRecord | null;
  enterpriseUserSearchQuery: string;
  enterpriseUserPage: number;
  enterpriseUserSortValue: EnterpriseUserSortValue;
  normalizedEnterpriseUserSearch: string;
  setEnterpriseUserPage: Dispatch<SetStateAction<number>>;
  setEnterpriseUserPageInput: Dispatch<SetStateAction<string>>;
  loadEnterpriseUsers: EnterpriseUserLoaders["loadEnterpriseUsers"];
};

function useEnterpriseUserFetchEffect(options: EnterpriseUserEffectsOptions) {
  const selectedEnterpriseId = options.selectedEnterprise?.id;
  const enterpriseUserSearchQuery = options.enterpriseUserSearchQuery;
  const enterpriseUserPage = options.enterpriseUserPage;
  const enterpriseUserSortValue = options.enterpriseUserSortValue;
  const loadEnterpriseUsers = options.loadEnterpriseUsers;
  useEffect(() => {
    if (!selectedEnterpriseId) {
      return;
    }
    void loadEnterpriseUsers(
      selectedEnterpriseId,
      enterpriseUserSearchQuery,
      enterpriseUserPage,
      enterpriseUserSortValue,
    );
  }, [enterpriseUserPage, enterpriseUserSearchQuery, enterpriseUserSortValue, loadEnterpriseUsers, selectedEnterpriseId]);
}

function useEnterpriseUserSearchResetEffect(options: EnterpriseUserEffectsOptions) {
  const normalizedEnterpriseUserSearch = options.normalizedEnterpriseUserSearch;
  const selectedEnterpriseId = options.selectedEnterprise?.id;
  const enterpriseUserSortValue = options.enterpriseUserSortValue;
  const setEnterpriseUserPage = options.setEnterpriseUserPage;
  useEffect(() => {
    setEnterpriseUserPage(1);
  }, [normalizedEnterpriseUserSearch, selectedEnterpriseId, enterpriseUserSortValue, setEnterpriseUserPage]);
}

function useEnterpriseUserPageInputSyncEffect(options: EnterpriseUserEffectsOptions) {
  const enterpriseUserPage = options.enterpriseUserPage;
  const setEnterpriseUserPageInput = options.setEnterpriseUserPageInput;
  useEffect(() => {
    setEnterpriseUserPageInput(String(enterpriseUserPage));
  }, [enterpriseUserPage, setEnterpriseUserPageInput]);
}

export function useEnterpriseUserEffects(options: EnterpriseUserEffectsOptions) {
  useEnterpriseUserFetchEffect(options);
  useEnterpriseUserSearchResetEffect(options);
  useEnterpriseUserPageInputSyncEffect(options);
}
