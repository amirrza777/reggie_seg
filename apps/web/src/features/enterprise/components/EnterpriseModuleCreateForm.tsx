"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useMemo, useRef, useState, useEffect, type FormEvent, type TextareaHTMLAttributes } from "react";
import {
  createEnterpriseModule,
  deleteEnterpriseModule,
  getEnterpriseModuleAccessSelection,
  searchEnterpriseModuleAccessUsers,
  updateEnterpriseModule,
} from "../api/client";
import type { EnterpriseAssignableUser, EnterpriseAccessUserSearchScope } from "../types";
import { normalizeSearchQuery } from "@/shared/lib/search";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";

const MODULE_NAME_MAX_LENGTH = 120;
const MODULE_SECTION_MAX_LENGTH = 8000;
const COUNTER_WARNING_RATIO = 0.9;
const ACCESS_USERS_PAGE_SIZE = 20;

type EnterpriseModuleCreateFormProps = {
  mode?: "create" | "edit";
  moduleId?: number;
};

type RequestState = "idle" | "loading" | "success" | "error";
type AccessBucket = "staff" | "ta" | "students";

export function EnterpriseModuleCreateForm({ mode = "create", moduleId }: EnterpriseModuleCreateFormProps) {
  const router = useRouter();
  const isEditMode = mode === "edit";

  const [moduleName, setModuleName] = useState("");
  const [moduleNameError, setModuleNameError] = useState<string | null>(null);
  const [briefText, setBriefText] = useState("");
  const [timelineText, setTimelineText] = useState("");
  const [expectationsText, setExpectationsText] = useState("");
  const [readinessNotesText, setReadinessNotesText] = useState("");

  const [leaderIds, setLeaderIds] = useState<number[]>([]);
  const [taIds, setTaIds] = useState<number[]>([]);
  const [studentIds, setStudentIds] = useState<number[]>([]);

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

  const [isLoadingAccess, setIsLoadingAccess] = useState(true);
  const [canEditModule, setCanEditModule] = useState(mode !== "edit");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteModule, setConfirmDeleteModule] = useState(false);

  const latestRequestIdRef = useRef<Record<AccessBucket, number>>({ staff: 0, ta: 0, students: 0 });

  useEffect(() => {
    let isActive = true;

    async function loadInitialSelection() {
      setIsLoadingAccess(true);
      setErrorMessage(null);
      setConfirmDeleteModule(false);
      setIsDeleting(false);
      setCanEditModule(mode !== "edit");

      try {
        if (mode === "edit") {
          if (!moduleId) throw new Error("Module id is required for edit mode.");

          const response = await getEnterpriseModuleAccessSelection(moduleId);
          if (!isActive) return;

          setCanEditModule(true);
          setModuleName(response.module.name ?? "");
          setBriefText(response.module.briefText ?? "");
          setTimelineText(response.module.timelineText ?? "");
          setExpectationsText(response.module.expectationsText ?? "");
          setReadinessNotesText(response.module.readinessNotesText ?? "");
          setLeaderIds(response.leaderIds);
          setTaIds(response.taIds);
          setStudentIds(response.studentIds);
        } else {
          setCanEditModule(true);
        }
      } catch (err) {
        if (!isActive) return;
        setCanEditModule(false);
        setErrorMessage(resolveModuleActionError(err, "load"));
      } finally {
        if (isActive) {
          setIsLoadingAccess(false);
        }
      }
    }

    void loadInitialSelection();

    return () => {
      isActive = false;
    };
  }, [mode, moduleId]);

  const loadAccessUsers = async (bucket: AccessBucket, query: string, page: number) => {
    const requestId = latestRequestIdRef.current[bucket] + 1;
    latestRequestIdRef.current[bucket] = requestId;

    const applyIfCurrent = (apply: () => void) => {
      if (latestRequestIdRef.current[bucket] !== requestId) return;
      apply();
    };

    const scope: EnterpriseAccessUserSearchScope = bucket === "staff" ? "staff" : bucket === "students" ? "students" : "all";

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
        scope,
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
        } else if (bucket === "ta") {
          setTaUsers(response.items);
          setTaTotal(response.total);
          setTaTotalPages(response.totalPages);
          setTaStatus("success");
        } else {
          setStudentUsers(response.items);
          setStudentTotal(response.total);
          setStudentTotalPages(response.totalPages);
          setStudentStatus("success");
        }
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
        } else if (bucket === "ta") {
          setTaUsers([]);
          setTaTotal(0);
          setTaTotalPages(0);
          setTaStatus("error");
          setTaMessage(message);
        } else {
          setStudentUsers([]);
          setStudentTotal(0);
          setStudentTotalPages(0);
          setStudentStatus("error");
          setStudentMessage(message);
        }
      });
    }
  };

  useEffect(() => {
    if (isLoadingAccess || (mode === "edit" && !canEditModule)) return;
    void loadAccessUsers("staff", staffSearchQuery, staffPage);
  }, [canEditModule, isLoadingAccess, mode, staffSearchQuery, staffPage]);

  useEffect(() => {
    if (isLoadingAccess || !isEditMode || !canEditModule) return;
    void loadAccessUsers("ta", taSearchQuery, taPage);
  }, [canEditModule, isEditMode, isLoadingAccess, taSearchQuery, taPage]);

  useEffect(() => {
    if (isLoadingAccess || !isEditMode || !canEditModule) return;
    void loadAccessUsers("students", studentSearchQuery, studentPage);
  }, [canEditModule, isEditMode, isLoadingAccess, studentSearchQuery, studentPage]);

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

  const leaderSet = useMemo(() => new Set(leaderIds), [leaderIds]);
  const taSet = useMemo(() => new Set(taIds), [taIds]);
  const studentSet = useMemo(() => new Set(studentIds), [studentIds]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = moduleName.trim();
    if (!name) {
      setModuleNameError("Module name is required.");
      return;
    }

    setModuleNameError(null);
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isEditMode) {
        if (!moduleId) throw new Error("Module id is required for edit mode.");
        await updateEnterpriseModule(moduleId, {
          name,
          briefText: normalizeOptionalMultilineText(briefText),
          timelineText: normalizeOptionalMultilineText(timelineText),
          expectationsText: normalizeOptionalMultilineText(expectationsText),
          readinessNotesText: normalizeOptionalMultilineText(readinessNotesText),
          leaderIds,
          taIds,
          studentIds,
        });
      } else {
        await createEnterpriseModule({
          name,
          leaderIds,
        });
      }

      router.push("/enterprise/modules");
      router.refresh();
    } catch (err) {
      setErrorMessage(resolveModuleActionError(err, isEditMode ? "update" : "create"));
      setIsSubmitting(false);
    }
  };

  const handleDeleteModule = async () => {
    if (mode !== "edit") return;
    if (!moduleId) {
      setErrorMessage("Module id is required for edit mode.");
      return;
    }
    if (!confirmDeleteModule) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteEnterpriseModule(moduleId);
      router.push("/enterprise/modules");
      router.refresh();
    } catch (err) {
      setErrorMessage(resolveModuleActionError(err, "delete"));
      setIsDeleting(false);
    }
  };

  const toggleLeader = (userId: number, checked: boolean) => {
    setLeaderIds((prev) => {
      if (checked) return includeId(prev, userId);
      return prev.filter((id) => id !== userId);
    });

    if (checked) {
      setTaIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const toggleTeachingAssistant = (userId: number, checked: boolean) => {
    setTaIds((prev) => {
      if (checked) return includeId(prev, userId);
      return prev.filter((id) => id !== userId);
    });
  };

  const toggleStudent = (userId: number, checked: boolean) => {
    setStudentIds((prev) => {
      if (checked) return includeId(prev, userId);
      return prev.filter((id) => id !== userId);
    });
  };

  const applyPageInput = (bucket: AccessBucket, rawValue: string) => {
    const parsedPage = Number(rawValue);
    const maxPage = bucket === "staff" ? Math.max(1, staffTotalPages) : bucket === "ta" ? Math.max(1, taTotalPages) : Math.max(1, studentTotalPages);
    const fallback = bucket === "staff" ? String(staffPage) : bucket === "ta" ? String(taPage) : String(studentPage);

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

  if (isLoadingAccess) {
    return <p className="muted">Loading module access options...</p>;
  }

  if (isEditMode && !canEditModule) {
    return (
      <div className="ui-stack-sm">
        <div className="status-alert status-alert--error enterprise-module-create__error">
          <span>{errorMessage ?? "Only module owners/leaders can edit this module."}</span>
        </div>
        <div className="ui-row ui-row--end enterprise-modules__create-actions enterprise-module-create__actions">
          <Button type="button" variant="ghost" onClick={() => router.push("/enterprise/modules")}>
            Back to modules
          </Button>
        </div>
      </div>
    );
  }

  const staffStart = getListStart(staffTotal, staffPage, ACCESS_USERS_PAGE_SIZE);
  const staffEnd = getListEnd(staffTotal, staffPage, ACCESS_USERS_PAGE_SIZE, staffUsers.length);
  const taStart = getListStart(taTotal, taPage, ACCESS_USERS_PAGE_SIZE);
  const taEnd = getListEnd(taTotal, taPage, ACCESS_USERS_PAGE_SIZE, taUsers.length);
  const studentStart = getListStart(studentTotal, studentPage, ACCESS_USERS_PAGE_SIZE);
  const studentEnd = getListEnd(studentTotal, studentPage, ACCESS_USERS_PAGE_SIZE, studentUsers.length);

  return (
    <form className="enterprise-modules__create-form enterprise-module-create__form" onSubmit={handleSubmit} noValidate>
      <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--name">
        <label htmlFor="module-name-input" className="enterprise-modules__create-field-label">
          Module name
        </label>
        <FormField
          id="module-name-input"
          value={moduleName}
          onChange={(event) => {
            const nextValue = event.target.value;
            setModuleName(nextValue);
            if (moduleNameError && nextValue.trim()) {
              setModuleNameError(null);
            }
          }}
          placeholder="Module name"
          aria-label="Module name"
          aria-invalid={moduleNameError ? true : undefined}
        />
        {moduleNameError ? <span className="enterprise-module-create__field-error">{moduleNameError}</span> : null}
        <CharacterCount value={moduleName} limit={MODULE_NAME_MAX_LENGTH} />
      </div>

      {isEditMode ? (
        <>
          <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--brief">
            <label htmlFor="module-brief-input" className="enterprise-modules__create-field-label">
              Module brief
            </label>
            <AutoGrowTextarea
              id="module-brief-input"
              className="ui-input enterprise-modules__create-textarea"
              value={briefText}
              onChange={(event) => setBriefText(event.target.value)}
              placeholder="Add the key context that should appear under Module brief."
              aria-label="Module brief"
              rows={5}
            />
            <CharacterCount value={briefText} limit={MODULE_SECTION_MAX_LENGTH} />
          </div>

          <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--timeline">
            <label htmlFor="module-timeline-input" className="enterprise-modules__create-field-label">
              Timeline
            </label>
            <AutoGrowTextarea
              id="module-timeline-input"
              className="ui-input enterprise-modules__create-textarea"
              value={timelineText}
              onChange={(event) => setTimelineText(event.target.value)}
              placeholder={
                "One line per event. Format: YYYY-MM-DD HH:mm | Project | Activity\n2026-09-15 09:00 | Foundation sprint | Project start"
              }
              aria-label="Timeline"
              rows={5}
            />
            <CharacterCount value={timelineText} limit={MODULE_SECTION_MAX_LENGTH} />
          </div>

          <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--expectations">
            <label htmlFor="module-expectations-input" className="enterprise-modules__create-field-label">
              Module expectations
            </label>
            <AutoGrowTextarea
              id="module-expectations-input"
              className="ui-input enterprise-modules__create-textarea"
              value={expectationsText}
              onChange={(event) => setExpectationsText(event.target.value)}
              placeholder={
                "One line per row. Format: Expectation | Target | Owner\nPeer assessment submissions | Fri 5 PM | Module lead"
              }
              aria-label="Module expectations"
              rows={5}
            />
            <CharacterCount value={expectationsText} limit={MODULE_SECTION_MAX_LENGTH} />
          </div>

          <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--readiness">
            <label htmlFor="module-readiness-input" className="enterprise-modules__create-field-label">
              Readiness notes
            </label>
            <AutoGrowTextarea
              id="module-readiness-input"
              className="ui-input enterprise-modules__create-textarea"
              value={readinessNotesText}
              onChange={(event) => setReadinessNotesText(event.target.value)}
              placeholder="Capture any operational reminders for this module."
              aria-label="Readiness notes"
              rows={4}
            />
            <CharacterCount value={readinessNotesText} limit={MODULE_SECTION_MAX_LENGTH} />
          </div>
        </>
      ) : (
        <p className="ui-note ui-note--muted">
          You can define module brief, timeline, expectations, teaching assistants, and student enrollment after creating the module.
        </p>
      )}

      <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--leaders">
        <label htmlFor="module-staff-search" className="enterprise-modules__create-field-label">
          Module owners/leaders
        </label>
        <p className="ui-note ui-note--muted">Owners can edit this module and manage role assignments.</p>
        <FormField
          id="module-staff-search"
          type="search"
          value={staffSearchQuery}
          onChange={(event) => setStaffSearchQuery(event.target.value)}
          placeholder="Search staff by name, email, or ID"
          aria-label="Search staff"
        />
        <span className="ui-note ui-note--muted">
          {staffStatus === "loading" && staffTotal === 0
            ? "Loading staff..."
            : staffTotal === 0
              ? "Showing 0 accounts"
              : `Showing ${staffStart}-${staffEnd} of ${staffTotal} accounts`}
        </span>
        <div className="enterprise-module-create__access-list" role="group" aria-label="Module leaders">
          {staffUsers.map((user) => (
            <label key={`leader-${user.id}`} className={`enterprise-module-create__access-item ${leaderSet.has(user.id) ? "is-selected" : ""}`}>
              <input
                type="checkbox"
                checked={leaderSet.has(user.id)}
                onChange={(event) => toggleLeader(user.id, event.target.checked)}
                disabled={isSubmitting || isDeleting}
              />
              <div className="ui-stack-xs">
                <strong>{user.firstName} {user.lastName}</strong>
                <span className="muted">{user.email} • ID {user.id}</span>
              </div>
              <span className={`status-chip ${user.active ? "status-chip--success" : "status-chip--danger"}`}>
                {user.active ? "Active" : "Inactive"}
              </span>
            </label>
          ))}
        </div>
        {staffUsers.length === 0 ? (
          <span className="ui-note ui-note--muted">
            {staffStatus === "loading"
              ? "Loading staff..."
              : normalizeSearchQuery(staffSearchQuery)
                ? `No staff match "${staffSearchQuery.trim()}".`
                : "No staff accounts found."}
          </span>
        ) : null}
        {staffMessage ? <span className="enterprise-module-create__field-error">{staffMessage}</span> : null}
        {staffTotalPages > 1 ? (
          <div className="user-management__pagination" aria-label="Staff search pagination">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStaffPage((prev) => Math.max(1, prev - 1))}
              disabled={staffPage === 1}
            >
              Previous
            </Button>
            <form className="user-management__page-jump" onSubmit={(event) => handlePageJump(event, "staff", staffPageInput)}>
              <label htmlFor="module-staff-page-input" className="user-management__page-jump-label">
                Page
              </label>
              <FormField
                id="module-staff-page-input"
                type="number"
                min={1}
                max={Math.max(1, staffTotalPages)}
                step={1}
                inputMode="numeric"
                value={staffPageInput}
                onChange={(event) => setStaffPageInput(event.target.value)}
                onBlur={() => applyPageInput("staff", staffPageInput)}
                className="user-management__page-jump-input"
                aria-label="Go to staff page"
              />
              <span className="muted user-management__page-total">of {Math.max(1, staffTotalPages)}</span>
            </form>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStaffPage((prev) => Math.min(Math.max(1, staffTotalPages), prev + 1))}
              disabled={staffPage === Math.max(1, staffTotalPages)}
            >
              Next
            </Button>
          </div>
        ) : null}
        <span className="ui-note ui-note--muted">{leaderIds.length} selected</span>
      </div>

      {isEditMode ? (
        <>
          <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--tas">
            <label className="enterprise-modules__create-field-label">Teaching assistants</label>
            <p className="ui-note ui-note--muted">
              TAs can be any account type and can access module workflows, but cannot manage role assignments.
            </p>
            <FormField
              id="module-ta-search"
              type="search"
              value={taSearchQuery}
              onChange={(event) => setTaSearchQuery(event.target.value)}
              placeholder="Search accounts by name, email, or ID"
              aria-label="Search teaching assistant accounts"
            />
            <span className="ui-note ui-note--muted">
              {taStatus === "loading" && taTotal === 0
                ? "Loading accounts..."
                : taTotal === 0
                  ? "Showing 0 accounts"
                  : `Showing ${taStart}-${taEnd} of ${taTotal} accounts`}
            </span>
            <div className="enterprise-module-create__access-list" role="group" aria-label="Teaching assistants">
              {taUsers.map((user) => (
                <label key={`ta-${user.id}`} className={`enterprise-module-create__access-item ${taSet.has(user.id) ? "is-selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={taSet.has(user.id)}
                    onChange={(event) => toggleTeachingAssistant(user.id, event.target.checked)}
                    disabled={isSubmitting || isDeleting || leaderSet.has(user.id)}
                  />
                  <div className="ui-stack-xs">
                    <strong>{user.firstName} {user.lastName}</strong>
                    <span className="muted">{user.email} • ID {user.id}</span>
                  </div>
                  <span className={`status-chip ${user.active ? "status-chip--success" : "status-chip--danger"}`}>
                    {user.active ? "Active" : "Inactive"}
                  </span>
                </label>
              ))}
            </div>
            {taUsers.length === 0 ? (
              <span className="ui-note ui-note--muted">
                {taStatus === "loading"
                  ? "Loading accounts..."
                  : normalizeSearchQuery(taSearchQuery)
                    ? `No accounts match "${taSearchQuery.trim()}".`
                    : "No assignable accounts found."}
              </span>
            ) : null}
            {taMessage ? <span className="enterprise-module-create__field-error">{taMessage}</span> : null}
            {taTotalPages > 1 ? (
              <div className="user-management__pagination" aria-label="Teaching assistant search pagination">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTaPage((prev) => Math.max(1, prev - 1))}
                  disabled={taPage === 1}
                >
                  Previous
                </Button>
                <form className="user-management__page-jump" onSubmit={(event) => handlePageJump(event, "ta", taPageInput)}>
                  <label htmlFor="module-ta-page-input" className="user-management__page-jump-label">
                    Page
                  </label>
                  <FormField
                    id="module-ta-page-input"
                    type="number"
                    min={1}
                    max={Math.max(1, taTotalPages)}
                    step={1}
                    inputMode="numeric"
                    value={taPageInput}
                    onChange={(event) => setTaPageInput(event.target.value)}
                    onBlur={() => applyPageInput("ta", taPageInput)}
                    className="user-management__page-jump-input"
                    aria-label="Go to teaching assistant page"
                  />
                  <span className="muted user-management__page-total">of {Math.max(1, taTotalPages)}</span>
                </form>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTaPage((prev) => Math.min(Math.max(1, taTotalPages), prev + 1))}
                  disabled={taPage === Math.max(1, taTotalPages)}
                >
                  Next
                </Button>
              </div>
            ) : null}
            <span className="ui-note ui-note--muted">{taIds.length} selected</span>
          </div>

          <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--students">
            <label htmlFor="module-student-search" className="enterprise-modules__create-field-label">
              Students
            </label>
            <p className="ui-note ui-note--muted">Enrolled students can participate in module projects and assessments.</p>
            <FormField
              id="module-student-search"
              type="search"
              value={studentSearchQuery}
              onChange={(event) => setStudentSearchQuery(event.target.value)}
              placeholder="Search students by name, email, or ID"
              aria-label="Search students"
            />
            <span className="ui-note ui-note--muted">
              {studentStatus === "loading" && studentTotal === 0
                ? "Loading students..."
                : studentTotal === 0
                  ? "Showing 0 students"
                  : `Showing ${studentStart}-${studentEnd} of ${studentTotal} students`}
            </span>
            <div className="enterprise-module-create__access-list" role="group" aria-label="Module students">
              {studentUsers.map((user) => (
                <label key={`student-${user.id}`} className={`enterprise-module-create__access-item ${studentSet.has(user.id) ? "is-selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={studentSet.has(user.id)}
                    onChange={(event) => toggleStudent(user.id, event.target.checked)}
                    disabled={isSubmitting || isDeleting}
                  />
                  <div className="ui-stack-xs">
                    <strong>{user.firstName} {user.lastName}</strong>
                    <span className="muted">{user.email} • ID {user.id}</span>
                  </div>
                  <span className={`status-chip ${user.active ? "status-chip--success" : "status-chip--danger"}`}>
                    {user.active ? "Active" : "Inactive"}
                  </span>
                </label>
              ))}
            </div>
            {studentUsers.length === 0 ? (
              <span className="ui-note ui-note--muted">
                {studentStatus === "loading"
                  ? "Loading students..."
                  : normalizeSearchQuery(studentSearchQuery)
                    ? `No students match "${studentSearchQuery.trim()}".`
                    : "No students found."}
              </span>
            ) : null}
            {studentMessage ? <span className="enterprise-module-create__field-error">{studentMessage}</span> : null}
            {studentTotalPages > 1 ? (
              <div className="user-management__pagination" aria-label="Student search pagination">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStudentPage((prev) => Math.max(1, prev - 1))}
                  disabled={studentPage === 1}
                >
                  Previous
                </Button>
                <form className="user-management__page-jump" onSubmit={(event) => handlePageJump(event, "students", studentPageInput)}>
                  <label htmlFor="module-student-page-input" className="user-management__page-jump-label">
                    Page
                  </label>
                  <FormField
                    id="module-student-page-input"
                    type="number"
                    min={1}
                    max={Math.max(1, studentTotalPages)}
                    step={1}
                    inputMode="numeric"
                    value={studentPageInput}
                    onChange={(event) => setStudentPageInput(event.target.value)}
                    onBlur={() => applyPageInput("students", studentPageInput)}
                    className="user-management__page-jump-input"
                    aria-label="Go to student page"
                  />
                  <span className="muted user-management__page-total">of {Math.max(1, studentTotalPages)}</span>
                </form>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStudentPage((prev) => Math.min(Math.max(1, studentTotalPages), prev + 1))}
                  disabled={studentPage === Math.max(1, studentTotalPages)}
                >
                  Next
                </Button>
              </div>
            ) : null}
            <span className="ui-note ui-note--muted">{studentIds.length} selected</span>
          </div>
        </>
      ) : null}

      {isEditMode ? (
        <div className="enterprise-modules__create-field enterprise-module-create__field enterprise-module-create__field--danger">
          <div className="enterprise-module-create__danger-zone">
            <h3 className="enterprise-module-create__danger-title">Delete module</h3>
            <p className="ui-note">
              This permanently deletes the module and its related projects, teams, and access assignments.
            </p>
            <label htmlFor="module-delete-confirmation" className="enterprise-module-create__danger-confirm">
              <input
                id="module-delete-confirmation"
                type="checkbox"
                checked={confirmDeleteModule}
                onChange={(event) => setConfirmDeleteModule(event.target.checked)}
                disabled={isSubmitting || isDeleting}
              />
              <span>I understand this action cannot be undone.</span>
            </label>
            <div className="ui-row ui-row--end">
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteModule}
                disabled={isSubmitting || isDeleting || !confirmDeleteModule}
              >
                {isDeleting ? "Deleting..." : "Delete module"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="status-alert status-alert--error enterprise-module-create__error">
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <div className="ui-row ui-row--end enterprise-modules__create-actions enterprise-module-create__actions">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/enterprise/modules")}
          disabled={isSubmitting || isDeleting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || isDeleting}>
          {isSubmitting ? (isEditMode ? "Saving..." : "Creating...") : isEditMode ? "Save module" : "Create module"}
        </Button>
      </div>
    </form>
  );
}

function getListStart(total: number, page: number, pageSize: number) {
  if (total === 0) return 0;
  return (page - 1) * pageSize + 1;
}

function getListEnd(total: number, page: number, pageSize: number, visibleCount: number) {
  if (total === 0) return 0;
  return Math.min((page - 1) * pageSize + visibleCount, total);
}

function includeId(values: number[], id: number): number[] {
  if (values.includes(id)) return values;
  return [...values, id];
}

function normalizeOptionalMultilineText(value: string): string | undefined {
  const normalized = value
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

  return normalized ? normalized : undefined;
}

function resolveModuleActionError(error: unknown, action: "load" | "create" | "update" | "delete"): string {
  if (error instanceof Error && error.message === "Forbidden") {
    return "Only module owners/leaders can edit this module.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (action === "load") return "Could not load module access options.";
  return `Could not ${action} module.`;
}

type AutoGrowTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

function AutoGrowTextarea({ value, ...rest }: AutoGrowTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.style.height = "auto";

    const computed = window.getComputedStyle(element);
    const minHeight = Number.parseFloat(computed.minHeight || "0");
    const maxHeightValue = computed.maxHeight;
    const parsedMaxHeight = Number.parseFloat(maxHeightValue || "");
    const maxHeight = Number.isFinite(parsedMaxHeight) ? parsedMaxHeight : Number.POSITIVE_INFINITY;

    const nextHeight = Math.max(minHeight, Math.min(element.scrollHeight, maxHeight));
    element.style.height = `${nextHeight}px`;
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value]);

  return <textarea ref={ref} value={value} {...rest} />;
}

type CharacterCountProps = {
  value: string;
  limit: number;
};

function CharacterCount({ value, limit }: CharacterCountProps) {
  const count = value.length;
  const isAtOrOverLimit = count >= limit;
  const isNearLimit = !isAtOrOverLimit && count >= Math.floor(limit * COUNTER_WARNING_RATIO);
  const toneClass = isAtOrOverLimit
    ? "enterprise-module-create__char-count--danger"
    : isNearLimit
      ? "enterprise-module-create__char-count--warning"
      : "enterprise-module-create__char-count--muted";

  return (
    <span className={`enterprise-module-create__char-count ${toneClass}`}>
      {count.toLocaleString()} / {limit.toLocaleString()}
    </span>
  );
}
