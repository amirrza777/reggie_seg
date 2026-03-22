import { findActiveUserEnterpriseById, findFeatureFlagByKey, listFeatureFlagsByEnterprise } from "./repo.js";

export async function resolveFeatureFlagEnterpriseIdForUser(userId: number) {
  const user = await findActiveUserEnterpriseById(userId);
  if (!user || user.active === false) return null;
  return user.enterpriseId;
}

export async function listFeatureFlagsForUser(userId: number) {
  const enterpriseId = await resolveFeatureFlagEnterpriseIdForUser(userId);
  if (!enterpriseId) return null;
  return listFeatureFlagsByEnterprise(enterpriseId);
}

export async function isFeatureEnabled(key: string, enterpriseId: string) {
  const flag = await findFeatureFlagByKey(enterpriseId, key);
  return flag?.enabled ?? false;
}

export async function isFeatureEnabledForUser(key: string, userId: number) {
  const enterpriseId = await resolveFeatureFlagEnterpriseIdForUser(userId);
  if (!enterpriseId) return false;
  const flag = await findFeatureFlagByKey(enterpriseId, key);
  return flag?.enabled ?? false;
}
