import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db.js";
import { DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES } from "../../shared/fuzzyFallback.js";
import {
  buildEnterpriseAccessUserSearchWhere,
  matchesEnterpriseAccessUserSearchCandidate,
  type EnterpriseAccessUserSearchFilters,
} from "./accessUserSearch.js";
import { toEnterpriseAccessUserSearchResponse } from "./service.core.js";

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

function sortAssignableUsersWithPriority(users: AssignableUserRow[], pinSet: ReadonlySet<number>): AssignableUserRow[] {
  return [...users].sort((a, b) => {
    const ap = pinSet.has(a.id) ? 0 : 1;
    const bp = pinSet.has(b.id) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    if (a.active !== b.active) return a.active ? -1 : 1;
    const fn = a.firstName.localeCompare(b.firstName);
    if (fn !== 0) return fn;
    const ln = a.lastName.localeCompare(b.lastName);
    if (ln !== 0) return ln;
    return a.email.localeCompare(b.email);
  });
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
  filters: Pick<
    EnterpriseAccessUserSearchFilters,
    "scope" | "query" | "page" | "pageSize" | "prioritiseUserIds" | "excludeOnModuleParticipation"
  >,
  excludeEnrolledInModuleId?: number,
) {
  const where = buildEnterpriseAccessUserSearchWhere(
    enterpriseId,
    filters,
    excludeEnrolledInModuleId === undefined
      ? undefined
      : {
          excludeEnrolledInModuleId,
          excludeOnModuleParticipation: filters.excludeOnModuleParticipation ?? "all",
        },
  );
  const pinIds = filters.prioritiseUserIds?.length ? filters.prioritiseUserIds : null;

  const total = await prisma.user.count({ where });

  if (!pinIds || pinIds.length === 0) {
    const offset = (filters.page - 1) * filters.pageSize;
    const users = await prisma.user.findMany({
      where,
      select: ASSIGNABLE_USER_SELECT,
      orderBy: ASSIGNABLE_USER_ORDER_BY,
      skip: offset,
      take: filters.pageSize,
    });
    return toEnterpriseAccessUserSearchResponse(users, filters, total);
  }

  const pinWhere: Prisma.UserWhereInput = { AND: [where, { id: { in: pinIds } }] };
  const pinnedUsers = await prisma.user.findMany({
    where: pinWhere,
    select: ASSIGNABLE_USER_SELECT,
    orderBy: ASSIGNABLE_USER_ORDER_BY,
  });
  const matchedPinIds = pinnedUsers.map((u) => u.id);
  const unpinnedWhere: Prisma.UserWhereInput =
    matchedPinIds.length > 0 ? { AND: [where, { id: { notIn: matchedPinIds } }] } : where;

  const pinnedCount = pinnedUsers.length;
  const page = filters.page;
  const pageSize = filters.pageSize;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  let pageUsers: AssignableUserRow[];
  if (start >= pinnedCount) {
    pageUsers = await prisma.user.findMany({
      where: unpinnedWhere,
      select: ASSIGNABLE_USER_SELECT,
      orderBy: ASSIGNABLE_USER_ORDER_BY,
      skip: start - pinnedCount,
      take: pageSize,
    });
  } else if (end <= pinnedCount) {
    pageUsers = pinnedUsers.slice(start, end);
  } else {
    const fromPinned = pinnedUsers.slice(start);
    const need = pageSize - fromPinned.length;
    const fromUnpinned = await prisma.user.findMany({
      where: unpinnedWhere,
      select: ASSIGNABLE_USER_SELECT,
      orderBy: ASSIGNABLE_USER_ORDER_BY,
      skip: 0,
      take: need,
    });
    pageUsers = [...fromPinned, ...fromUnpinned];
  }

  return toEnterpriseAccessUserSearchResponse(pageUsers, filters, total);
}

export async function runFuzzyAssignableUserSearch(
  enterpriseId: string,
  filters: Pick<
    EnterpriseAccessUserSearchFilters,
    "scope" | "query" | "page" | "pageSize" | "prioritiseUserIds" | "excludeOnModuleParticipation"
  >,
  strictResponse: ReturnType<typeof toEnterpriseAccessUserSearchResponse>,
  excludeEnrolledInModuleId?: number,
) {
  const fuzzyBaseWhere = buildEnterpriseAccessUserSearchWhere(
    enterpriseId,
    { scope: filters.scope, query: null },
    excludeEnrolledInModuleId === undefined
      ? undefined
      : {
          excludeEnrolledInModuleId,
          excludeOnModuleParticipation: filters.excludeOnModuleParticipation ?? "all",
        },
  );
  const candidateTotal = await prisma.user.count({ where: fuzzyBaseWhere });
  if (candidateTotal === 0 || candidateTotal > DEFAULT_FUZZY_FALLBACK_MAX_CANDIDATES) return strictResponse;

  const candidates = await prisma.user.findMany({
    where: fuzzyBaseWhere,
    select: ASSIGNABLE_USER_SELECT,
    orderBy: ASSIGNABLE_USER_ORDER_BY,
    take: candidateTotal,
  });
  const matched = candidates.filter((c) => matchesEnterpriseAccessUserSearchCandidate(c, filters.query ?? ""));
  const pinSet = new Set(filters.prioritiseUserIds ?? []);
  const ordered = pinSet.size > 0 ? sortAssignableUsersWithPriority(matched, pinSet) : matched;
  const offset = (filters.page - 1) * filters.pageSize;
  return toEnterpriseAccessUserSearchResponse(
    ordered.slice(offset, offset + filters.pageSize),
    filters,
    ordered.length,
  );
}
