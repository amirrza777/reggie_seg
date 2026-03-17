"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
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
};

export function useEnterpriseModuleAccessBuckets({
  mode,
  isEditMode,
  isLoadingAccess,
  canEditModule,
}: UseEnterpriseModuleAccessBucketsParams) {
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
    const requestId = latestRequestIdRef.current[bucket] + 1;
    latestRequestIdRef.current[bucket] = requestId;

    const applyIfCurrent = (apply: () => void) => {
      if (latestRequestIdRef.current[bucket] !== requestId) return;
      apply();
    };

    if (bucket === "staff") {
      setStaffStatus("loading");
      setStaffMessage(null);
    } else if (bucket === "ta") {
      setTaStatus("loading");
      setTaMessage(null);
    } else {
      setStudentStatus("loading");
      setStudentMessage(null);
    }

    try {
      const response = await searchEnterpriseModuleAccessUsers({
        scope: resolveScopeForBucket(bucket),
        q: query.trim() || undefined,
        page,
        pageSize: ACCESS_USERS_PAGE_SIZE,
      });

      applyIfCurrent(() => {
        if (response.totalPages > 0 && response.page > response.totalPages) {
          if (bucket === "staff") setStaffPage(response.totalPages);
          else if (bucket === "ta") setTaPage(response.totalPages);
          else setStudentPage(response.totalPages);
          return;
        }

        if (bucket === "staff") {
          setStaffUsers(response.items);
          setStaffTotal(response.total);
          setStaffTotalPages(response.totalPages);
          setStaffStatus("success");
          return;
        }

        if (bucket === "ta") {
          setTaUsers(response.items);
          setTaTotal(response.total);
          setTaTotalPages(response.totalPages);
          setTaStatus("success");
          return;
        }

        setStudentUsers(response.items);
        setStudentTotal(response.total);
        setStudentTotalPages(response.totalPages);
        setStudentStatus("success");
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load users.";
      applyIfCurrent(() => {
        if (bucket === "staff") {
          setStaffUsers([]);
          setStaffTotal(0);
          setStaffTotalPages(0);
          setStaffStatus("error");
          setStaffMessage(message);
          return;
        }

        if (bucket === "ta") {
          setTaUsers([]);
          setTaTotal(0);
          setTaTotalPages(0);
          setTaStatus("error");
          setTaMessage(message);
          return;
        }

        setStudentUsers([]);
        setStudentTotal(0);
        setStudentTotalPages(0);
        setStudentStatus("error");
        setStudentMessage(message);
      });
    }
  }, []);

  useEffect(() => {
    if (isLoadingAccess || (mode === "edit" && !canEditModule)) return;
    void loadAccessUsers("staff", staffSearchQuery, staffPage);
  }, [canEditModule, isLoadingAccess, loadAccessUsers, mode, staffSearchQuery, staffPage]);

  useEffect(() => {
    if (isLoadingAccess || !isEditMode || !canEditModule) return;
    void loadAccessUsers("ta", taSearchQuery, taPage);
  }, [canEditModule, isEditMode, isLoadingAccess, loadAccessUsers, taSearchQuery, taPage]);

  useEffect(() => {
    if (isLoadingAccess || !isEditMode || !canEditModule) return;
    void loadAccessUsers("students", studentSearchQuery, studentPage);
  }, [canEditModule, isEditMode, isLoadingAccess, loadAccessUsers, studentSearchQuery, studentPage]);

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
    setStaffPageInput(String(staffPage));
  }, [staffPage]);

  useEffect(() => {
    setTaPageInput(String(taPage));
  }, [taPage]);

  useEffect(() => {
    setStudentPageInput(String(studentPage));
  }, [studentPage]);

  const applyPageInput = (bucket: AccessBucket, rawValue: string) => {
    const parsedPage = Number(rawValue);
    const maxPage =
      bucket === "staff"
        ? Math.max(1, staffTotalPages)
        : bucket === "ta"
          ? Math.max(1, taTotalPages)
          : Math.max(1, studentTotalPages);

    const fallback =
      bucket === "staff"
        ? String(staffPage)
        : bucket === "ta"
          ? String(taPage)
          : String(studentPage);

    if (!Number.isInteger(parsedPage) || parsedPage < 1 || parsedPage > maxPage) {
      if (bucket === "staff") setStaffPageInput(fallback);
      else if (bucket === "ta") setTaPageInput(fallback);
      else setStudentPageInput(fallback);
      return;
    }

    if (bucket === "staff") setStaffPage(parsedPage);
    else if (bucket === "ta") setTaPage(parsedPage);
    else setStudentPage(parsedPage);
  };

  const handlePageJump = (event: FormEvent<HTMLFormElement>, bucket: AccessBucket, inputValue: string) => {
    event.preventDefault();
    applyPageInput(bucket, inputValue);
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
    handlePageJump,
  };
}

function resolveScopeForBucket(bucket: AccessBucket): EnterpriseAccessUserSearchScope {
  if (bucket === "staff") return "staff";
  if (bucket === "students") return "students";
  return "all";
}

function getListStart(total: number, page: number, pageSize: number) {
  if (total === 0) return 0;
  return (page - 1) * pageSize + 1;
}

function getListEnd(total: number, page: number, pageSize: number, visibleCount: number) {
  if (total === 0) return 0;
  return Math.min((page - 1) * pageSize + visibleCount, total);
}
