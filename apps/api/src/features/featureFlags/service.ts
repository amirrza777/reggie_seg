import { ensureDefaultEnterprise, findFeatureFlagByKey, listFeatureFlagsByEnterprise } from "./repo.js";

export async function listDefaultEnterpriseFeatureFlags() {
  const enterprise = await ensureDefaultEnterprise();
  return listFeatureFlagsByEnterprise(enterprise.id);
}

export async function isFeatureEnabled(key: string, enterpriseId?: string) {
  const resolvedEnterpriseId = enterpriseId ?? (await ensureDefaultEnterprise()).id;
  const flag = await findFeatureFlagByKey(resolvedEnterpriseId, key);
  return flag?.enabled ?? false;
}
