"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { getEffectiveTotalPages, getPaginationEnd, getPaginationStart, parsePageInput } from "@/shared/lib/pagination";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { normalizeSearchQuery } from "@/shared/lib/search";
import { PaginationControls, PaginationPageJump } from "@/shared/ui/PaginationControls";
import { SearchField } from "@/shared/ui/SearchField";
import { SkeletonText } from "@/shared/ui/Skeleton";
import type { AdminUser, AdminUserRecord, UserRole, AdminSummary } from "../types";
import { listUsers, searchUsers, updateUserRole, getAdminSummary } from "../api/client";
import { AuditLogModal } from "./AuditLogModal";

const demoStaff: AdminUser[] = [
  {
    id: 7,
    email: "staff.lead@example.com",
    firstName: "Arun",
    lastName: "Dijkstra",
    isStaff: true,
    role: "ADMIN",
    active: true,
  },
  {
    id: 6,
    email: "staff.member@example.com",
    firstName: "Anastasiya",
    lastName: "Ojo",
    isStaff: true,
    role: "STAFF",
    active: true,
  },
  {
    id: 2,
    email: "staff.ops@example.com",
    firstName: "Jane",
    lastName: "Okon",
    isStaff: true,
    role: "STAFF",
    active: true,
  },
];

type RequestState = "idle" | "loading" | "success" | "error";
const STAFF_DIRECTORY_PAGE_SIZE = 100;

const normalizeUser = (user: AdminUserRecord): AdminUser => ({
  ...user,
  role: user.role ?? (user.isStaff ? "STAFF" : "STUDENT"),
  active: user.active ?? true,
});

const isStaffAccount = (user: AdminUser) => user.role !== "STUDENT" && (user.isStaff || user.role === "ADMIN");

export function AdminWorkspaceSummaryView() {
  const [modalOpen, setModalOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState<RequestState>("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<Record<number, RequestState>>({});
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<RequestState>("idle");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [totalStaff, setTotalStaff] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const latestRequestId = useRef(0);

  const staffDirectory = useMemo(() => staff.filter(isStaffAccount), [staff]);
  const normalizedSearchQuery = normalizeSearchQuery(searchQuery);
  const effectiveTotalPages = getEffectiveTotalPages(totalPages);
  const staffStart = getPaginationStart(totalStaff, currentPage, STAFF_DIRECTORY_PAGE_SIZE);
  const staffEnd = getPaginationEnd(totalStaff, currentPage, STAFF_DIRECTORY_PAGE_SIZE, staffDirectory.length);

  const setStaffRow = (userId: number, update: (user: AdminUser) => AdminUser) => {
    setStaff((prev) => prev.map((user) => (user.id === userId ? update(user) : user)));
  };

  const loadStaff = useCallback(async () => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    setStatus("loading");
    setNotice(null);

    try {
      const response = await searchUsers({
        q: normalizedSearchQuery || undefined,
        page: currentPage,
        pageSize: STAFF_DIRECTORY_PAGE_SIZE,
      });
      if (latestRequestId.current !== requestId) {return;}
      const normalized = response.items.map(normalizeUser).filter(isStaffAccount);
      if (response.totalPages > 0 && response.page > response.totalPages) {
        setCurrentPage(response.totalPages);
        return;
      }
      if (normalized.length === 0) {
        setNotice(
          normalizedSearchQuery
            ? `No staff accounts match "${searchQuery.trim()}".`
            : "No staff accounts yet. Mark a user as Staff to manage admin access here."
        );
      }
      setStaff(normalized);
      setTotalStaff(response.total);
      setTotalPages(response.totalPages);
      setStatus("success");
    } catch (err) {
      if (latestRequestId.current !== requestId) {return;}
      let fallback = demoStaff;
      try {
        const users = await listUsers();
        fallback = users.map(normalizeUser).filter(isStaffAccount);
      } catch {
        fallback = demoStaff;
      }
      const fallbackStart = (currentPage - 1) * STAFF_DIRECTORY_PAGE_SIZE;
      const pagedFallback = fallback.slice(fallbackStart, fallbackStart + STAFF_DIRECTORY_PAGE_SIZE);
      const fallbackTotalPages = fallback.length === 0 ? 0 : Math.ceil(fallback.length / STAFF_DIRECTORY_PAGE_SIZE);
      setStaff(pagedFallback);
      setTotalStaff(fallback.length);
      setTotalPages(fallbackTotalPages);
      setStatus("error");
      setNotice("Couldn't load staff directory. Showing sample data.");
    }
  }, [currentPage, normalizedSearchQuery, searchQuery]);

  useEffect(() => {
    if (!modalOpen) {return;}
    void loadStaff();
  }, [modalOpen, loadStaff]);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearchQuery]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const applyPageInput = useCallback((value: string) => {
    const parsedPage = parsePageInput(value, totalPages);
    if (parsedPage === null) {
      setPageInput(String(currentPage));
      return;
    }
    setCurrentPage(parsedPage);
  }, [currentPage, totalPages]);

  const handlePageJump = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyPageInput(pageInput);
  }, [applyPageInput, pageInput]);

  useEffect(() => {
    const loadSummary = async () => {
      setSummaryStatus("loading");
      try {
        const data = await getAdminSummary();
        setSummary(data);
        setSummaryStatus("success");
      } catch (err) {
        setSummaryStatus("error");
        setNotice((err as Error)?.message ?? "Unable to load admin summary.");
      }
    };
    loadSummary();
  }, []);

  const changeRole = async (userId: number, role: UserRole) => {
    const previous = staff.map((user) => ({ ...user }));
    setActionStatus((state) => ({ ...state, [userId]: "loading" }));
    setNotice(null);
    setStaffRow(userId, (user) => ({ ...user, role, isStaff: role !== "STUDENT" ? true : user.isStaff }));

    try {
      const updated = await updateUserRole(userId, role);
      setStaffRow(userId, () => normalizeUser(updated));
      setStatus("success");
      setNotice(role === "ADMIN" ? "Admin access granted." : "Admin access removed.");
    } catch (err) {
      setStaff(previous);
      setStatus("error");
      setNotice(err instanceof Error ? err.message : "Could not update admin role.");
    } finally {
      setActionStatus((state) => ({ ...state, [userId]: "idle" }));
    }
  };

  return (
    <>
      <Card
        title="Workspace snapshot"
        className="admin-overview-card"
        action={
          <div className="admin-overview-actions">
            <Button type="button" className="admin-overview-actions__btn" onClick={() => setModalOpen(true)}>
              Invite admin
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="admin-overview-actions__btn"
              onClick={() => setAuditOpen(true)}
            >
              Audit log
            </Button>
          </div>
        }
      >
        <div className="ui-grid-metrics">
          {[
            { label: "Users", value: summary?.users },
            { label: "Modules", value: summary?.modules },
            { label: "Teams", value: summary?.teams },
            { label: "Meetings", value: summary?.meetings },
          ].map((item) => (
            <div key={item.label} className="ui-metric-card">
              <span className="eyebrow">{item.label}</span>
              <strong className="ui-metric-value">
                {item.value ?? (summaryStatus === "loading" ? "…" : 0)}
              </strong>
            </div>
          ))}
        </div>
      </Card>

      {modalOpen ? (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-admin-title"
          onClick={() => setModalOpen(false)}
        >
          <div className="modal__dialog admin-modal ui-content-width" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header ui-modal-header">
              <div className="ui-stack-sm">
                <h3 id="invite-admin-title">
                  Invite admin
                </h3>
                <p className="muted">
                  Select a staff member to grant or revoke admin privileges.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="modal__close-btn"
                aria-label="Close"
                onClick={() => setModalOpen(false)}
              >
                ×
              </Button>
            </div>

            <div className="modal__body admin-modal__body">
              <div className="ui-toolbar">
                <span className="ui-note ui-note--muted">
                  {status === "loading"
                    ? "Loading staff directory..."
                    : totalStaff === 0
                      ? "Showing 0 staff accounts."
                      : `Showing ${staffStart}-${staffEnd} of ${totalStaff} staff accounts.`}
                </span>
              </div>
              <SearchField
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, email, role, or ID"
                aria-label="Search staff directory"
                className="user-management__search"
              />

              {notice ? (
                <div
                  className={status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success"}
                >
                  <span>{notice}</span>
                </div>
              ) : null}

              <div className="table admin-modal__list">
                <div className="table__head admin-modal__head">
                  <div>Email</div>
                  <div>Name</div>
                  <div className="ui-inline-end">Actions</div>
                </div>
                <div className="admin-modal__table" role="presentation">
                  {status === "loading" && staffDirectory.length === 0 ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <div key={`staff-loading-${index}`} className="table__row admin-modal__row" aria-hidden="true">
                        <SkeletonText lines={2} widths={["68%", "34%"]} />
                        <SkeletonText lines={2} widths={["56%", "28%"]} />
                        <SkeletonText lines={1} widths={["62%"]} />
                      </div>
                    ))
                  ) : staffDirectory.length === 0 ? (
                    <div className="table__row admin-modal__row">
                      <div className="muted admin-modal__full-span">
                        No staff accounts found. Promote a user to Staff to manage admin access here.
                      </div>
                    </div>
                  ) : (
                    staffDirectory.map((user) => {
                      const isAdmin = user.role === "ADMIN";
                      const busy = actionStatus[user.id] === "loading";
                      return (
                        <div
                          key={user.id}
                          className="table__row admin-modal__row"
                        >
                          <div className="ui-stack-xs">
                            <strong>{user.email}</strong>
                            <span className="muted">{isAdmin ? "Admin" : "Staff"}</span>
                          </div>
                          <div className="ui-stack-xs">
                            <span>{`${user.firstName} ${user.lastName}`}</span>
                            <span className="muted">ID {user.id}</span>
                          </div>
                          <div className="admin-modal__actions">
                            <Button
                              type="button"
                              variant={isAdmin ? "primary" : "ghost"}
                              onClick={() => changeRole(user.id, isAdmin ? "STAFF" : "ADMIN")}
                              disabled={busy}
                              className={`admin-toggle ${isAdmin ? "admin-toggle--remove" : "admin-toggle--make"}`}
                            >
                              {isAdmin ? "Remove admin" : "Make admin"}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {!(status === "loading" && staffDirectory.length === 0) ? (
                <PaginationControls
                  ariaLabel="Staff directory pagination"
                  page={currentPage}
                  totalPages={totalPages}
                  onPreviousPage={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  onNextPage={() => setCurrentPage((prev) => Math.min(effectiveTotalPages, prev + 1))}
                >
                  <PaginationPageJump
                    pageInputId="staff-directory-page-input"
                    pageInput={pageInput}
                    totalPages={totalPages}
                    pageJumpAriaLabel="Go to staff directory page number"
                    onPageInputChange={setPageInput}
                    onPageInputBlur={() => applyPageInput(pageInput)}
                    onPageJump={handlePageJump}
                  />
                </PaginationControls>
              ) : null}
            </div>

          </div>
        </div>
      ) : null}

      <AuditLogModal open={auditOpen} onClose={() => setAuditOpen(false)} />
    </>
  );
}
