import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import { DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES } from "../../shared/fuzzyFallback.js";
import {
  buildEnterpriseAccessUserSearchWhere,
  matchesEnterpriseAccessUserSearchCandidate,
  type EnterpriseAccessUserSearchFilters,
} from "./accessUserSearch.js";
import { toEnterpriseAccessUserSearchResponse } from "./service.shared.js";

const ASSIGNABLE_USER_SELECT = { id: true, email: true, firstName: true, lastName: true, active: true } satisfies Prisma.UserSelect;
const ASSIGNABLE_USER_ORDER_BY: Prisma.UserOrderByWithRelationInput[] = [
  { active: "desc" },
  { firstName: "asc" },
  { lastName: "asc" },
  { email: "asc" },
];

type AssignableUserRow = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
};

type AssignableSearchFilters = Pick<
  EnterpriseAccessUserSearchFilters,
  "scope" | "query" | "page" | "pageSize" | "prioritiseUserIds" | "excludeOnModuleParticipation"
>;

function sortAssignableUsersWithPriority(users: AssignableUserRow[], pinSet: ReadonlySet<number>): AssignableUserRow[] {
  return [...users].sort((a, b) => {
    const ap = pinSet.has(a.id) ? 0 : 1;
    const bp = pinSet.has(b.id) ? 0 : 1;
    if (ap !== bp) {
      return ap - bp;
    }
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }
    const fn = a.firstName.localeCompare(b.firstName);
    if (fn !== 0) {
      return fn;
    }
    const ln = a.lastName.localeCompare(b.lastName);
    if (ln !== 0) {
      return ln;
    }
    return a.email.localeCompare(b.email);
  });
}

function buildAssignableWhereOptions(filters: AssignableSearchFilters, excludeEnrolledInModuleId?: number) {
  if (excludeEnrolledInModuleId === undefined) {
    return undefined;
  }
  return {
    excludeEnrolledInModuleId,
    excludeOnModuleParticipation: filters.excludeOnModuleParticipation ?? "all",
  };
}

function buildAssignableSearchWhere(
  enterpriseId: string,
  filters: AssignableSearchFilters,
  excludeEnrolledInModuleId?: number,
) {
  return buildEnterpriseAccessUserSearchWhere(
    enterpriseId,
    filters,
    buildAssignableWhereOptions(filters, excludeEnrolledInModuleId),
  );
}

function getPageOffset(page: number, pageSize: number) {
  return (page - 1) * pageSize;
}

async function findAssignableUsersPage(where: Prisma.UserWhereInput, skip: number, take: number) {
  return prisma.user.findMany({
    where,
    select: ASSIGNABLE_USER_SELECT,
    orderBy: ASSIGNABLE_USER_ORDER_BY,
    skip,
    take,
  });
}

async function findPinnedAndUnpinnedAssignableUsers(
  where: Prisma.UserWhereInput,
  pinIds: readonly number[],
) {
  const pinnedUsers = await prisma.user.findMany({
    where: { AND: [where, { id: { in: [...pinIds] } }] },
    select: ASSIGNABLE_USER_SELECT,
    orderBy: ASSIGNABLE_USER_ORDER_BY,
  });
  const matchedPinIds = pinnedUsers.map((user) => user.id);
  const unpinnedWhere: Prisma.UserWhereInput =
    matchedPinIds.length > 0 ? { AND: [where, { id: { notIn: matchedPinIds } }] } : where;
  return { pinnedUsers, unpinnedWhere };
}

async function findPinnedStrictPage(
  where: Prisma.UserWhereInput,
  pinIds: readonly number[],
  filters: Pick<EnterpriseAccessUserSearchFilters, "page" | "pageSize">,
) {
  const { pinnedUsers, unpinnedWhere } = await findPinnedAndUnpinnedAssignableUsers(where, pinIds);
  const offset = getPageOffset(filters.page, filters.pageSize);
  const pageEnd = offset + filters.pageSize;
  if (offset >= pinnedUsers.length) {
    return findAssignableUsersPage(unpinnedWhere, offset - pinnedUsers.length, filters.pageSize);
  }
  if (pageEnd <= pinnedUsers.length) {
    return pinnedUsers.slice(offset, pageEnd);
  }
  const fromPinned = pinnedUsers.slice(offset);
  const fromUnpinned = await findAssignableUsersPage(unpinnedWhere, 0, filters.pageSize - fromPinned.length);
  return [...fromPinned, ...fromUnpinned];
}

function orderMatchedAssignableUsers(
  users: AssignableUserRow[],
  prioritiseUserIds: readonly number[] | undefined,
) {
  const pinSet = new Set(prioritiseUserIds ?? []);
  return pinSet.size > 0 ? sortAssignableUsersWithPriority(users, pinSet) : users;
}

export async function listAssignableUsersByEnterprise(enterpriseId: string) {
  const [staff, students] = await Promise.all([
    prisma.user.findMany({
      where: {
        enterpriseId,
        role: { in: ["STAFF", "ENTERPRISE_ADMIN"] },
      },
      select: ASSIGNABLE_USER_SELECT,
      orderBy: ASSIGNABLE_USER_ORDER_BY,
    }),
    prisma.user.findMany({
      where: {
        enterpriseId,
        role: "STUDENT",
      },
      select: ASSIGNABLE_USER_SELECT,
      orderBy: ASSIGNABLE_USER_ORDER_BY,
    }),
  ]);

  return { staff, students };
}

export async function runStrictAssignableUserSearch(
  enterpriseId: string,
  filters: AssignableSearchFilters,
  excludeEnrolledInModuleId?: number,
) {
  const where = buildAssignableSearchWhere(enterpriseId, filters, excludeEnrolledInModuleId);
  const pinIds = filters.prioritiseUserIds?.length ? filters.prioritiseUserIds : null;
  const total = await prisma.user.count({ where });
  let users: AssignableUserRow[];
  if (pinIds) {
    users = await findPinnedStrictPage(where, pinIds, filters);
  } else {
    users = await findAssignableUsersPage(where, getPageOffset(filters.page, filters.pageSize), filters.pageSize);
  }
  return toEnterpriseAccessUserSearchResponse(users, filters, total);
}

export async function runFuzzyAssignableUserSearch(
  enterpriseId: string,
  filters: AssignableSearchFilters,
  strictResponse: ReturnType<typeof toEnterpriseAccessUserSearchResponse>,
  excludeEnrolledInModuleId?: number,
) {
  const fuzzyBaseWhere = buildEnterpriseAccessUserSearchWhere(
    enterpriseId,
    { scope: filters.scope, query: null },
    buildAssignableWhereOptions(filters, excludeEnrolledInModuleId),
  );
  const candidateTotal = await prisma.user.count({ where: fuzzyBaseWhere });
  if (candidateTotal === 0 || candidateTotal > DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES) {
    return strictResponse;
  }

  const candidates = await prisma.user.findMany({
    where: fuzzyBaseWhere,
    select: ASSIGNABLE_USER_SELECT,
    orderBy: ASSIGNABLE_USER_ORDER_BY,
    take: candidateTotal,
  });
  const matched = candidates.filter((c) => matchesEnterpriseAccessUserSearchCandidate(c, filters.query ?? ""));
  const ordered = orderMatchedAssignableUsers(matched, filters.prioritiseUserIds);
  const offset = getPageOffset(filters.page, filters.pageSize);
  return toEnterpriseAccessUserSearchResponse(
    ordered.slice(offset, offset + filters.pageSize),
    filters,
    ordered.length,
  );
}
