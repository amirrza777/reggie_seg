import { ENTERPRISE_FEATURE_FLAG_DEFAULTS } from "./defaults.js";
import {
  ensureFeatureFlagsByEnterprise,
  findActiveUserEnterpriseById,
  listFeatureFlagsByEnterprise,
} from "./repo.js";

export async function resolveFeatureFlagEnterpriseIdForUser(userId: number) {
  const user = await findActiveUserEnterpriseById(userId);
  if (!user || user.active === false) return null;
  return user.enterpriseId;
}

export async function listFeatureFlagsForUser(userId: number) {
  const enterpriseId = await resolveFeatureFlagEnterpriseIdForUser(userId);
  if (!enterpriseId) return null;
  await ensureFeatureFlagsByEnterprise(enterpriseId, ENTERPRISE_FEATURE_FLAG_DEFAULTS);
  return listFeatureFlagsByEnterprise(enterpriseId);
}
