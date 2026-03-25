"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { searchEnterpriseModules } from "../api/client";
import type { EnterpriseModuleRecord } from "../types";
import { normalizeSearchQuery } from "@/shared/lib/search";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { FormField } from "@/shared/ui/FormField";
import { SearchField } from "@/shared/ui/SearchField";
import { Table } from "@/shared/ui/Table";

type RequestState = "idle" | "loading" | "success" | "error";

const MODULES_PER_PAGE = 10;

type EnterpriseModuleManagerProps = {
  canCreateModule?: boolean;
};

function ModulesSummaryLabel({
  modulesStatus,
  totalModules,
  moduleStart,
  moduleEnd,
}: {
  modulesStatus: RequestState;
  totalModules: number;
  moduleStart: number;
  moduleEnd: number;
}) {
  if (modulesStatus === "loading" && totalModules === 0) return "Loading modules...";
  if (totalModules === 0) return "Showing 0 modules";
  return `Showing ${moduleStart}-${moduleEnd} of ${totalModules} module${totalModules === 1 ? "" : "s"}`;
}

function EnterpriseModulesPagination({
  currentPage,
  effectiveTotalPages,
  pageInput,
  setPageInput,
  setCurrentPage,
  handlePageJump,
  applyPageInput,
}: {
  currentPage: number;
  effectiveTotalPages: number;
  pageInput: string;
  setPageInput: (value: string) => void;
  setCurrentPage: (update: (prev: number) => number) => void;
  handlePageJump: (event: FormEvent<HTMLFormElement>) => void;
  applyPageInput: (value: string) => void;
}) {
  return (
    <div className="user-management__pagination" aria-label="Enterprise modules pagination">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
        disabled={currentPage === 1}
      >
        Previous
      </Button>
      <form className="user-management__page-jump" onSubmit={handlePageJump}>
        <label htmlFor="enterprise-modules-page-input" className="user-management__page-jump-label">
          Page
        </label>
        <FormField
          id="enterprise-modules-page-input"
          type="number"
          min={1}
          max={effectiveTotalPages}
          step={1}
          inputMode="numeric"
          value={pageInput}
          onChange={(event) => setPageInput(event.target.value)}
          onBlur={() => applyPageInput(pageInput)}
          className="user-management__page-jump-input"
          aria-label="Go to modules page number"
        />
        <span className="muted user-management__page-total">of {effectiveTotalPages}</span>
      </form>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setCurrentPage((prev) => Math.min(effectiveTotalPages, prev + 1))}
        disabled={currentPage === effectiveTotalPages}
      >
        Next
      </Button>
    </div>
  );
}

function buildModuleRows(modules: EnterpriseModuleRecord[]) {
  return modules.map((module) => [
    <div key={`${module.id}-name`} className="ui-stack-xs">
      <strong>{module.name}</strong>
      <span className="muted">Module ID {module.id}</span>
    </div>,
    <span key={`${module.id}-leaders`}>{module.leaderCount}</span>,
    <span key={`${module.id}-tas`}>{module.teachingAssistantCount}</span>,
    <span key={`${module.id}-students`}>{module.studentCount}</span>,
    <span key={`${module.id}-updated`}>{formatDate(module.updatedAt)}</span>,
    <div key={`${module.id}-actions`} className="enterprise-modules__row-actions">
      {module.canManageAccess ? (
        <Link href={`/enterprise/modules/${module.id}/edit`} className="btn btn--ghost btn--sm">
          Edit module
        </Link>
      ) : (
        <span className="ui-note ui-note--muted">Leader only</span>
      )}
    </div>,
  ]);
}

export function EnterpriseModuleManager({ canCreateModule = true }: EnterpriseModuleManagerProps) {
  const [modules, setModules] = useState<EnterpriseModuleRecord[]>([]);
  const [modulesStatus, setModulesStatus] = useState<RequestState>("idle");
  const [modulesMessage, setModulesMessage] = useState<string | null>(null);
  const [moduleSearchQuery, setModuleSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [totalModules, setTotalModules] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const latestRequestId = useRef(0);

  const normalizedSearch = normalizeSearchQuery(moduleSearchQuery);
  const effectiveTotalPages = Math.max(1, totalPages);

  const loadModules = useCallback(async (query: string, page: number) => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    setModulesStatus("loading");
    setModulesMessage(null);

    try {
      const response = await searchEnterpriseModules({
        q: query.trim() || undefined,
        page,
        pageSize: MODULES_PER_PAGE,
      });
      if (latestRequestId.current !== requestId) return;

      if (response.totalPages > 0 && response.page > response.totalPages) {
        setCurrentPage(response.totalPages);
        return;
      }

      setModules(response.items);
      setTotalModules(response.total);
      setTotalPages(response.totalPages);
      setModulesStatus("success");
    } catch (err) {
      if (latestRequestId.current !== requestId) return;
      setModules([]);
      setTotalModules(0);
      setTotalPages(0);
      setModulesStatus("error");
      setModulesMessage(err instanceof Error ? err.message : "Could not load modules.");
    }
  }, []);

  useEffect(() => {
    void loadModules(moduleSearchQuery, currentPage);
  }, [moduleSearchQuery, currentPage, loadModules]);

  useEffect(() => {
    setCurrentPage(1);
  }, [normalizedSearch]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const applyPageInput = (value: string) => {
    const parsedPage = Number(value);
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || parsedPage > effectiveTotalPages) {
      setPageInput(String(currentPage));
      return;
    }
    setCurrentPage(parsedPage);
  };

  const handlePageJump = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyPageInput(pageInput);
  };

  const moduleStart = totalModules === 0 ? 0 : (currentPage - 1) * MODULES_PER_PAGE + 1;
  const moduleEnd =
    totalModules === 0 ? 0 : Math.min((currentPage - 1) * MODULES_PER_PAGE + modules.length, totalModules);

  const moduleRows = buildModuleRows(modules);
  const showSkeletonTable = modulesStatus === "loading" && moduleRows.length === 0;

  return (
    <Card
      title={<span className="overview-title">Enterprise modules</span>}
      action={canCreateModule ? (
        <Link href="/enterprise/modules/create" className="btn btn--primary enterprise-modules__create-trigger">
          Create module
        </Link>
      ) : undefined}
      className="enterprise-modules__card"
    >
      <p className="muted">Create modules, set owners/leaders and teaching assistants, and enroll students.</p>

      <div className="ui-toolbar enterprise-modules__toolbar">
        <SearchField
          value={moduleSearchQuery}
          onChange={(event) => setModuleSearchQuery(event.target.value)}
          placeholder="Search modules by name or ID"
          aria-label="Search modules"
          className="enterprise-modules__search"
        />
        <span className="ui-note ui-note--muted">
          <ModulesSummaryLabel
            modulesStatus={modulesStatus}
            totalModules={totalModules}
            moduleStart={moduleStart}
            moduleEnd={moduleEnd}
          />
        </span>
      </div>

      {modulesMessage && modulesStatus === "error" ? (
        <div className="status-alert status-alert--error">
          <span>{modulesMessage}</span>
        </div>
      ) : null}

      {moduleRows.length > 0 || showSkeletonTable ? (
        <>
          <Table
            headers={["Module", "Leaders", "TAs", "Students", "Updated", "Actions"]}
            rows={moduleRows}
            rowClassName="enterprise-modules__row"
            columnTemplate="1.5fr 0.5fr 0.5fr 0.7fr 0.8fr 1fr"
            isLoading={showSkeletonTable}
            loadingLabel="Loading modules..."
            loadingRowCount={6}
          />
          {totalPages > 1 && !showSkeletonTable ? (
            <EnterpriseModulesPagination
              currentPage={currentPage}
              effectiveTotalPages={effectiveTotalPages}
              pageInput={pageInput}
              setPageInput={setPageInput}
              setCurrentPage={setCurrentPage}
              handlePageJump={handlePageJump}
              applyPageInput={applyPageInput}
            />
          ) : null}
        </>
      ) : (
        <div className="ui-empty-state">
          <p>
            {normalizeSearchQuery(moduleSearchQuery)
                ? `No modules match "${moduleSearchQuery.trim()}".`
                : "No modules yet. Create your first module above."}
          </p>
        </div>
      )}
    </Card>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
