"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { searchEnterpriseModuleAccessUsers } from "../api/client";
import type { EnterpriseAccessUserSearchScope, EnterpriseAssignableUser } from "../types";
import { normalizeSearchQuery } from "@/shared/lib/search";

const ACCESS_USERS_PAGE_SIZE = 20;

type RequestState = "idle" | "loading" | "success" | "error";

export type AccessBucket = "staff" | "ta" | "students";

type UseEnterpriseModuleAccessBucketsParams = {
  mode: "create" | "edit";
  isEditMode: boolean;
  isLoadingAccess: boolean;
  canEditModule: boolean;
  /** When set, access-user search can omit users already on this module (per-bucket toggles). */
  moduleIdForAccessSearchExclude?: number;
};

type AccessUsersResponse = Awaited<ReturnType<typeof searchEnterpriseModuleAccessUsers>>;

type BucketStateSetters = {
  setUsers: Dispatch<SetStateAction<EnterpriseAssignableUser[]>>;
  setStatus: Dispatch<SetStateAction<RequestState>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
  setPage: Dispatch<SetStateAction<number>>;
  setPageInput: Dispatch<SetStateAction<string>>;
  setTotal: Dispatch<SetStateAction<number>>;
  setTotalPages: Dispatch<SetStateAction<number>>;
};

export function useEnterpriseModuleAccessBuckets({
  mode,
  isEditMode,
  isLoadingAccess,
  canEditModule,
  moduleIdForAccessSearchExclude,
}: UseEnterpriseModuleAccessBucketsParams) {
  const [staffSearchOnlyWithoutModuleAccess, setStaffSearchOnlyWithoutModuleAccess] = useState(false);
  const [taSearchOnlyWithoutModuleAccess, setTaSearchOnlyWithoutModuleAccess] = useState(false);
  const [studentSearchOnlyWithoutModuleAccess, setStudentSearchOnlyWithoutModuleAccess] = useState(false);

  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [taSearchQuery, setTaSearchQuery] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  const [staffUsers, setStaffUsers] = useState<EnterpriseAssignableUser[]>([]);
  const [staffStatus, setStaffStatus] = useState<RequestState>("idle");
  const [staffMessage, setStaffMessage] = useState<string | null>(null);
  const [staffPage, setStaffPage] = useState(1);
  const [staffPageInput, setStaffPageInput] = useState("1");
  const [staffTotal, setStaffTotal] = useState(0);
  const [staffTotalPages, setStaffTotalPages] = useState(0);

  const [taUsers, setTaUsers] = useState<EnterpriseAssignableUser[]>([]);
  const [taStatus, setTaStatus] = useState<RequestState>("idle");
  const [taMessage, setTaMessage] = useState<string | null>(null);
  const [taPage, setTaPage] = useState(1);
  const [taPageInput, setTaPageInput] = useState("1");
  const [taTotal, setTaTotal] = useState(0);
  const [taTotalPages, setTaTotalPages] = useState(0);

  const [studentUsers, setStudentUsers] = useState<EnterpriseAssignableUser[]>([]);
  const [studentStatus, setStudentStatus] = useState<RequestState>("idle");
  const [studentMessage, setStudentMessage] = useState<string | null>(null);
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageInput, setStudentPageInput] = useState("1");
  const [studentTotal, setStudentTotal] = useState(0);
  const [studentTotalPages, setStudentTotalPages] = useState(0);

  const latestRequestIdRef = useRef<Record<AccessBucket, number>>({ staff: 0, ta: 0, students: 0 });

  const loadAccessUsers = useCallback(async (bucket: AccessBucket, query: string, page: number) => {
    const setters = resolveBucketValue(bucket, {
      staff: {
        setUsers: setStaffUsers,
        setStatus: setStaffStatus,
        setMessage: setStaffMessage,
        setPage: setStaffPage,
        setPageInput: setStaffPageInput,
        setTotal: setStaffTotal,
        setTotalPages: setStaffTotalPages,
      },
      ta: {
        setUsers: setTaUsers,
        setStatus: setTaStatus,
        setMessage: setTaMessage,
        setPage: setTaPage,
        setPageInput: setTaPageInput,
        setTotal: setTaTotal,
        setTotalPages: setTaTotalPages,
      },
      students: {
        setUsers: setStudentUsers,
        setStatus: setStudentStatus,
        setMessage: setStudentMessage,
        setPage: setStudentPage,
        setPageInput: setStudentPageInput,
        setTotal: setStudentTotal,
        setTotalPages: setStudentTotalPages,
      },
    });

    const requestId = latestRequestIdRef.current[bucket] + 1;
    latestRequestIdRef.current[bucket] = requestId;

    const applyIfCurrent = (apply: () => void) => {
      if (latestRequestIdRef.current[bucket] !== requestId) return;
      apply();
    };

    setBucketLoading(setters);

    try {
      const wantExclude =
        (bucket === "staff" && staffSearchOnlyWithoutModuleAccess) ||
        (bucket === "ta" && taSearchOnlyWithoutModuleAccess) ||
        (bucket === "students" && studentSearchOnlyWithoutModuleAccess);

      const excludeEnrolledInModule =
        wantExclude && moduleIdForAccessSearchExclude != null ? moduleIdForAccessSearchExclude : undefined;

      const response = await searchEnterpriseModuleAccessUsers({
        scope: resolveScopeForBucket(bucket),
        q: query.trim() || undefined,
        page,
        pageSize: ACCESS_USERS_PAGE_SIZE,
        ...(excludeEnrolledInModule != null ? { excludeEnrolledInModule } : {}),
      });

      applyIfCurrent(() => {
        if (response.totalPages > 0 && response.page > response.totalPages) {
          setters.setPage(response.totalPages);
          return;
        }
        setBucketSuccess(setters, response);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load users.";
      applyIfCurrent(() => {
        setBucketError(setters, message);
      });
    }
  }, [
    staffSearchOnlyWithoutModuleAccess,
    taSearchOnlyWithoutModuleAccess,
    studentSearchOnlyWithoutModuleAccess,
    moduleIdForAccessSearchExclude,
  ]);

  useEffect(() => {
    if (isLoadingAccess || (mode === "edit" && !canEditModule)) return;
    void loadAccessUsers("staff", staffSearchQuery, staffPage);
  }, [canEditModule, isLoadingAccess, loadAccessUsers, mode, staffSearchQuery, staffPage, staffSearchOnlyWithoutModuleAccess]);

  useEffect(() => {
    if (isLoadingAccess || !isEditMode || !canEditModule) return;
    void loadAccessUsers("ta", taSearchQuery, taPage);
  }, [canEditModule, isEditMode, isLoadingAccess, loadAccessUsers, taSearchQuery, taPage, taSearchOnlyWithoutModuleAccess]);

  useEffect(() => {
    if (isLoadingAccess || !isEditMode || !canEditModule) return;
    void loadAccessUsers("students", studentSearchQuery, studentPage);
  }, [
    canEditModule,
    studentSearchOnlyWithoutModuleAccess,
    isEditMode,
    isLoadingAccess,
    loadAccessUsers,
    studentSearchQuery,
    studentPage,
  ]);

  const normalizedStaffSearchQuery = normalizeSearchQuery(staffSearchQuery);
  const normalizedTaSearchQuery = normalizeSearchQuery(taSearchQuery);
  const normalizedStudentSearchQuery = normalizeSearchQuery(studentSearchQuery);

  useEffect(() => {
    setStaffPage(1);
  }, [normalizedStaffSearchQuery]);

  useEffect(() => {
    setTaPage(1);
  }, [normalizedTaSearchQuery]);

  useEffect(() => {
    setStudentPage(1);
  }, [normalizedStudentSearchQuery]);

  useEffect(() => {
    setStaffPage(1);
  }, [staffSearchOnlyWithoutModuleAccess]);

  useEffect(() => {
    setTaPage(1);
  }, [taSearchOnlyWithoutModuleAccess]);

  useEffect(() => {
    setStudentPage(1);
  }, [studentSearchOnlyWithoutModuleAccess]);

  useEffect(() => {
    setStaffPageInput(String(staffPage));
  }, [staffPage]);

  useEffect(() => {
    setTaPageInput(String(taPage));
  }, [taPage]);

  useEffect(() => {
    setStudentPageInput(String(studentPage));
  }, [studentPage]);

  const applyPageInput = (bucket: AccessBucket, rawValue: string) => {
    const currentPage = resolveBucketValue(bucket, { staff: staffPage, ta: taPage, students: studentPage });
    const totalPages = resolveBucketValue(bucket, { staff: staffTotalPages, ta: taTotalPages, students: studentTotalPages });
    const setPage = resolveBucketValue(bucket, { staff: setStaffPage, ta: setTaPage, students: setStudentPage });
    const setPageInput = resolveBucketValue(bucket, {
      staff: setStaffPageInput,
      ta: setTaPageInput,
      students: setStudentPageInput,
    });

    const parsedPage = Number(rawValue);
    const maxPage = Math.max(1, totalPages);
    const fallback = String(currentPage);

    if (!Number.isInteger(parsedPage) || parsedPage < 1 || parsedPage > maxPage) {
      setPageInput(fallback);
      return;
    }

    setPage(parsedPage);
  };

  const staffStart = getListStart(staffTotal, staffPage, ACCESS_USERS_PAGE_SIZE);
  const staffEnd = getListEnd(staffTotal, staffPage, ACCESS_USERS_PAGE_SIZE, staffUsers.length);
  const taStart = getListStart(taTotal, taPage, ACCESS_USERS_PAGE_SIZE);
  const taEnd = getListEnd(taTotal, taPage, ACCESS_USERS_PAGE_SIZE, taUsers.length);
  const studentStart = getListStart(studentTotal, studentPage, ACCESS_USERS_PAGE_SIZE);
  const studentEnd = getListEnd(studentTotal, studentPage, ACCESS_USERS_PAGE_SIZE, studentUsers.length);

  return {
    staffSearchQuery,
    taSearchQuery,
    studentSearchQuery,
    staffUsers,
    taUsers,
    studentUsers,
    staffStatus,
    taStatus,
    studentStatus,
    staffMessage,
    taMessage,
    studentMessage,
    staffPage,
    taPage,
    studentPage,
    staffPageInput,
    taPageInput,
    studentPageInput,
    staffTotal,
    taTotal,
    studentTotal,
    staffTotalPages,
    taTotalPages,
    studentTotalPages,
    staffStart,
    taStart,
    studentStart,
    staffEnd,
    taEnd,
    studentEnd,
    setStaffSearchQuery,
    setTaSearchQuery,
    setStudentSearchQuery,
    setStaffPage,
    setTaPage,
    setStudentPage,
    setStaffPageInput,
    setTaPageInput,
    setStudentPageInput,
    applyPageInput,
    staffSearchOnlyWithoutModuleAccess,
    setStaffSearchOnlyWithoutModuleAccess,
    taSearchOnlyWithoutModuleAccess,
    setTaSearchOnlyWithoutModuleAccess,
    studentSearchOnlyWithoutModuleAccess,
    setStudentSearchOnlyWithoutModuleAccess,
  };
}

function resolveScopeForBucket(bucket: AccessBucket): EnterpriseAccessUserSearchScope {
  if (bucket === "staff") return "staff";
  if (bucket === "students") return "students";
  return "all";
}

function resolveBucketValue<T>(bucket: AccessBucket, values: Record<AccessBucket, T>): T {
  return values[bucket];
}

function setBucketLoading(setters: BucketStateSetters) {
  setters.setStatus("loading");
  setters.setMessage(null);
}

function setBucketSuccess(setters: BucketStateSetters, response: AccessUsersResponse) {
  setters.setUsers(response.items);
  setters.setTotal(response.total);
  setters.setTotalPages(response.totalPages);
  setters.setStatus("success");
}

function setBucketError(setters: BucketStateSetters, message: string) {
  setters.setUsers([]);
  setters.setTotal(0);
  setters.setTotalPages(0);
  setters.setStatus("error");
  setters.setMessage(message);
}

function getListStart(total: number, page: number, pageSize: number) {
  if (total === 0) return 0;
  return (page - 1) * pageSize + 1;
}

function getListEnd(total: number, page: number, pageSize: number, visibleCount: number) {
  if (total === 0) return 0;
  return Math.min((page - 1) * pageSize + visibleCount, total);
}
