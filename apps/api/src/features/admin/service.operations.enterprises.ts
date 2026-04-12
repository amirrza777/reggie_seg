/* eslint-disable max-lines-per-function, max-statements, complexity, max-depth */
import { recordAuditLog } from "../audit/service.js";
import { EnterpriseCodeGeneratorService } from "./enterpriseCodeGeneratorService.js";
import {
  buildAdminEnterpriseSearchWhere,
  matchesAdminEnterpriseFuzzyCandidate,
  type AdminEnterpriseSearchFilters,
} from "./enterpriseSearch.js";
import { ENTERPRISE_FEATURE_FLAG_DEFAULTS } from "../featureFlags/defaults.js";
import * as repo from "./repo.js";
import type { EnterpriseFlagSeed } from "./types.js";
import {
  DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES,
  fuzzyFilterAndPaginate,
  shouldUseFuzzyFallback,
} from "../../shared/fuzzyFallback.js";
import {
  ENTERPRISE_CODE_REGEX,
  ENTERPRISE_CREATE_MAX_CODE_GENERATION_ATTEMPTS,
  buildVisibleEnterpriseWhere,
  isEnterpriseCodeUniqueConstraintError,
  toAdminEnterprisePayload,
  toAdminEnterpriseSearchResponse,
} from "./service.operations.shared.js";

const enterpriseCodeGenerator = new EnterpriseCodeGeneratorService();
const defaultEnterpriseFeatureFlags: EnterpriseFlagSeed[] = [...ENTERPRISE_FEATURE_FLAG_DEFAULTS];

export async function listEnterprises() {
  const enterprises = await repo.listEnterprises(buildVisibleEnterpriseWhere({}));
  return enterprises.map(toAdminEnterprisePayload);
}

export async function searchEnterprises(filters: AdminEnterpriseSearchFilters) {
  const where = buildVisibleEnterpriseWhere(buildAdminEnterpriseSearchWhere(filters));
  const [total, records] = await Promise.all([
    repo.countEnterprisesByWhere(where),
    repo.listEnterprisesByWhere(where, filters.page, filters.pageSize),
  ]);
  const strictResponse = toAdminEnterpriseSearchResponse(records.map(toAdminEnterprisePayload), filters, total);
  if (!shouldUseFuzzyFallback(total, filters.query)) {
    return strictResponse;
  }

  const fuzzyWhere = buildVisibleEnterpriseWhere({});
  const candidateTotal = await repo.countEnterprisesByWhere(fuzzyWhere);
  if (candidateTotal === 0 || candidateTotal > DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES) {
    return strictResponse;
  }

  const candidates = await repo.listEnterpriseFuzzyCandidatesByWhere(fuzzyWhere, 1, candidateTotal);
  const fuzzyPage = fuzzyFilterAndPaginate(candidates, {
    query: filters.query,
    pagination: filters,
    matches: matchesAdminEnterpriseFuzzyCandidate,
  });

  const pageIds = fuzzyPage.items.map((enterprise) => enterprise.id);
  if (pageIds.length === 0) {
    return toAdminEnterpriseSearchResponse([], filters, fuzzyPage.total);
  }

  const pageRecords = await repo.listEnterprisesByIds(pageIds);
  const recordsById = new Map(pageRecords.map((record) => [record.id, record]));
  const orderedItems = pageIds
    .map((id) => recordsById.get(id))
    .filter((record): record is (typeof pageRecords)[number] => Boolean(record))
    .map(toAdminEnterprisePayload);

  return toAdminEnterpriseSearchResponse(orderedItems, filters, fuzzyPage.total);
}

export async function createEnterprise(input: { name: string; code?: string | null }, actorId?: number) {
  const nameRaw = input.name.trim();
  if (!nameRaw) {
    return { ok: false as const, status: 400, error: "Enterprise name is required" };
  }
  if (nameRaw.length > 120) {
    return { ok: false as const, status: 400, error: "Enterprise name is too long" };
  }
  const requestedCode = input.code?.trim().toUpperCase() ?? "";
  if (requestedCode && !ENTERPRISE_CODE_REGEX.test(requestedCode)) {
    return { ok: false as const, status: 400, error: "Code must be 3-16 uppercase letters or numbers" };
  }

  const createWithCode = async (code: string) => {
    const created = await repo.createEnterpriseWithFlags(nameRaw, code, defaultEnterpriseFeatureFlags);
    if (actorId) {
      await recordAuditLog({ userId: actorId, action: "ENTERPRISE_CREATED" });
    }
    return {
      ok: true as const,
      value: {
        ...created,
        users: 0,
        admins: 0,
        enterpriseAdmins: 0,
        staff: 0,
        students: 0,
        modules: 0,
        teams: 0,
      },
    };
  };

  if (requestedCode) {
    const exists = await repo.findEnterpriseByCode(requestedCode);
    if (exists) {
      return { ok: false as const, status: 409, error: "Enterprise code already exists" };
    }
    try {
      return await createWithCode(requestedCode);
    } catch (err) {
      if (isEnterpriseCodeUniqueConstraintError(err)) {
        return { ok: false as const, status: 409, error: "Enterprise code already exists" };
      }
      throw err;
    }
  }

  for (let attempt = 0; attempt < ENTERPRISE_CREATE_MAX_CODE_GENERATION_ATTEMPTS; attempt += 1) {
    const code = await enterpriseCodeGenerator.generateFromName(nameRaw);
    try {
      return await createWithCode(code);
    } catch (err) {
      if (isEnterpriseCodeUniqueConstraintError(err)) {
        continue;
      }
      throw err;
    }
  }

  return { ok: false as const, status: 409, error: "Enterprise code already exists" };
}

export async function deleteEnterprise(
  targetEnterpriseId: string,
  actingEnterpriseId: string | undefined,
  actorId?: number,
) {
  if (actingEnterpriseId === targetEnterpriseId) {
    return { ok: false as const, status: 400, error: "Cannot delete your own enterprise" };
  }
  const enterprise = await repo.findEnterpriseForDeletion(targetEnterpriseId);
  if (!enterprise) {
    return { ok: false as const, status: 404, error: "Enterprise not found" };
  }
  if (enterprise._count.users > 0 || enterprise._count.modules > 0 || enterprise._count.teams > 0) {
    return {
      ok: false as const,
      status: 400,
      error: `Cannot delete enterprise while it has users (${enterprise._count.users}), modules (${enterprise._count.modules}), or teams (${enterprise._count.teams}).`,
    };
  }
  await repo.deleteEnterpriseWithDependencies(targetEnterpriseId, enterprise._count.auditLogs);
  if (actorId) {
    await recordAuditLog({ userId: actorId, action: "ENTERPRISE_DELETED" });
  }
  return { ok: true as const, value: { success: true } };
}
