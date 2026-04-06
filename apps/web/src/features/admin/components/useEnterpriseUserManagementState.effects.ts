import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { EnterpriseRecord } from "../types";
import type { EnterpriseUserLoaders } from "./useEnterpriseUserManagementState.shared";

type EnterpriseUserEffectsOptions = {
  selectedEnterprise: EnterpriseRecord | null;
  enterpriseUserSearchQuery: string;
  enterpriseUserPage: number;
  normalizedEnterpriseUserSearch: string;
  setEnterpriseUserPage: Dispatch<SetStateAction<number>>;
  setEnterpriseUserPageInput: Dispatch<SetStateAction<string>>;
  loadEnterpriseUsers: EnterpriseUserLoaders["loadEnterpriseUsers"];
};

function useEnterpriseUserFetchEffect(options: EnterpriseUserEffectsOptions) {
  useEffect(() => {
    if (!options.selectedEnterprise) {
      return;
    }
    void options.loadEnterpriseUsers(options.selectedEnterprise.id, options.enterpriseUserSearchQuery, options.enterpriseUserPage);
  }, [options]);
}

function useEnterpriseUserSearchResetEffect(options: EnterpriseUserEffectsOptions) {
  const normalizedEnterpriseUserSearch = options.normalizedEnterpriseUserSearch;
  const selectedEnterpriseId = options.selectedEnterprise?.id;
  const setEnterpriseUserPage = options.setEnterpriseUserPage;
  useEffect(() => {
    setEnterpriseUserPage(1);
  }, [normalizedEnterpriseUserSearch, selectedEnterpriseId, setEnterpriseUserPage]);
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
