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

export function useEnterpriseUserEffects(options: EnterpriseUserEffectsOptions) {
  const {
    selectedEnterprise,
    enterpriseUserSearchQuery,
    enterpriseUserPage,
    normalizedEnterpriseUserSearch,
    setEnterpriseUserPage,
    setEnterpriseUserPageInput,
    loadEnterpriseUsers,
  } = options;

  useEffect(() => {
    if (!selectedEnterprise) return;
    void loadEnterpriseUsers(
      selectedEnterprise.id,
      enterpriseUserSearchQuery,
      enterpriseUserPage,
    );
  }, [
    enterpriseUserPage,
    enterpriseUserSearchQuery,
    loadEnterpriseUsers,
    selectedEnterprise,
  ]);

  useEffect(() => {
    setEnterpriseUserPage(1);
  }, [normalizedEnterpriseUserSearch, selectedEnterprise?.id, setEnterpriseUserPage]);

  useEffect(() => {
    setEnterpriseUserPageInput(String(enterpriseUserPage));
  }, [enterpriseUserPage, setEnterpriseUserPageInput]);
}
