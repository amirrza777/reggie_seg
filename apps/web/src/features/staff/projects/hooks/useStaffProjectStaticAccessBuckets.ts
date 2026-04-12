"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { EnterpriseAssignableUser } from "@/features/enterprise/types";
import type { StaffProjectManageAccessPerson } from "@/features/projects/types";
import { getPaginationEnd, getPaginationStart, parsePageInput } from "@/shared/lib/pagination";
import { normalizeSearchQuery } from "@/shared/lib/search";

const PAGE_SIZE = 20;

type RequestState = "idle" | "loading" | "success" | "error";

export type StaffProjectStudentAccessListOptions = {
  prioritiseUserIds: readonly number[];
  hideAlreadySelectedForProject: boolean;
  selectedProjectStudentIds: Set<number>;
};

function toAssignable(p: StaffProjectManageAccessPerson): EnterpriseAssignableUser {
  return {
    id: p.id,
    email: p.email,
    firstName: p.firstName,
    lastName: p.lastName,
    active: true,
  };
}

function sortAssignable(a: EnterpriseAssignableUser, b: EnterpriseAssignableUser) {
  const ln = a.lastName.localeCompare(b.lastName);
  if (ln !== 0) return ln;
  return a.firstName.localeCompare(b.firstName);
}

function filterPool(pool: EnterpriseAssignableUser[], rawQuery: string): EnterpriseAssignableUser[] {
  const q = normalizeSearchQuery(rawQuery);
  if (!q) return pool;
  const blob = (u: EnterpriseAssignableUser) =>
    `${u.firstName} ${u.lastName} ${u.email} ${u.id}`.toLowerCase();
  const needle = q.toLowerCase();
  return pool.filter((u) => blob(u).includes(needle));
}

function buildOrderedList(
  pool: EnterpriseAssignableUser[],
  searchQuery: string,
  prioritiseUserIds: readonly number[],
  hideAlreadySelectedForProject: boolean,
  selectedProjectStudentIds: Set<number>,
): EnterpriseAssignableUser[] {
  const filtered = filterPool(pool, searchQuery);
  const byId = new Map(filtered.map((u) => [u.id, u]));
  const pinned: EnterpriseAssignableUser[] = [];
  for (const id of prioritiseUserIds) {
    const u = byId.get(id);
    if (u) pinned.push(u);
  }
  const pinIds = new Set(pinned.map((u) => u.id));
  const rest = filtered.filter((u) => !pinIds.has(u.id)).sort(sortAssignable);
  let ordered = [...pinned, ...rest];
  if (hideAlreadySelectedForProject) {
    ordered = ordered.filter((u) => !selectedProjectStudentIds.has(u.id));
  }
  return ordered;
}

/**
 * Client-side search + pagination for project student access (module member subset).
 * Mirrors module access: baseline students pinned first, optional “hide already selected”.
 */
export function useStaffProjectStaticAccessBuckets(
  moduleMemberDirectory: StaffProjectManageAccessPerson[],
  options: StaffProjectStudentAccessListOptions,
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  const pool = useMemo(
    () => moduleMemberDirectory.map(toAssignable),
    [moduleMemberDirectory],
  );

  const normalizedQuery = normalizeSearchQuery(searchQuery);

  const orderedList = useMemo(
    () =>
      buildOrderedList(
        pool,
        searchQuery,
        options.prioritiseUserIds,
        options.hideAlreadySelectedForProject,
        options.selectedProjectStudentIds,
      ),
    [pool, searchQuery, options.prioritiseUserIds, options.hideAlreadySelectedForProject, options.selectedProjectStudentIds],
  );

  const total = orderedList.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [
    normalizedQuery,
    pool,
    options.hideAlreadySelectedForProject,
    options.prioritiseUserIds,
    options.selectedProjectStudentIds,
  ]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPageInput(String(safePage));
  }, [safePage]);

  const start = getPaginationStart(total, safePage, PAGE_SIZE);
  const slice = orderedList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const end = getPaginationEnd(total, safePage, PAGE_SIZE, slice.length);

  const applyPageInput = useCallback(
    (raw: string) => {
      const parsed = parsePageInput(raw, totalPages);
      if (parsed === null) {
        setPageInput(String(safePage));
        return;
      }
      setPage(parsed);
    },
    [safePage, totalPages],
  );

  const status: RequestState = "success";

  return {
    studentSearchQuery: searchQuery,
    setStudentSearchQuery: setSearchQuery,
    studentUsers: slice,
    studentStatus: status,
    studentTotal: total,
    studentStart: start,
    studentEnd: end,
    studentPage: safePage,
    studentPageInput: pageInput,
    studentTotalPages: totalPages,
    setStudentPage: setPage,
    setStudentPageInput: setPageInput,
    applyStudentPageInput: applyPageInput,
  };
}
