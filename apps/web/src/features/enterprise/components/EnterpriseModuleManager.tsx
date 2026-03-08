"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createEnterpriseModule, listEnterpriseModules, listEnterpriseModuleStudents, updateEnterpriseModuleStudents } from "../api/client";
import type { EnterpriseModuleRecord, EnterpriseModuleStudent } from "../types";
import { filterBySearchQuery, normalizeSearchQuery } from "@/shared/lib/search";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { FormField } from "@/shared/ui/FormField";
import { Table } from "@/shared/ui/Table";

type RequestState = "idle" | "loading" | "success" | "error";

export function EnterpriseModuleManager() {
  const [modules, setModules] = useState<EnterpriseModuleRecord[]>([]);
  const [modulesStatus, setModulesStatus] = useState<RequestState>("idle");
  const [modulesMessage, setModulesMessage] = useState<string | null>(null);
  const [newModuleName, setNewModuleName] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [moduleSearchQuery, setModuleSearchQuery] = useState("");

  const [selectedModule, setSelectedModule] = useState<EnterpriseModuleRecord | null>(null);
  const [students, setStudents] = useState<EnterpriseModuleStudent[]>([]);
  const [studentsStatus, setStudentsStatus] = useState<RequestState>("idle");
  const [studentsMessage, setStudentsMessage] = useState<string | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [isSavingStudents, setIsSavingStudents] = useState(false);

  const loadModules = useCallback(async () => {
    setModulesStatus("loading");
    setModulesMessage(null);
    try {
      const response = await listEnterpriseModules();
      setModules(response);
      setModulesStatus("success");
    } catch (err) {
      setModulesStatus("error");
      setModulesMessage(err instanceof Error ? err.message : "Could not load modules.");
    }
  }, []);

  useEffect(() => {
    void loadModules();
  }, [loadModules]);

  const filteredModules = useMemo(
    () =>
      filterBySearchQuery(modules, moduleSearchQuery, {
        fields: ["id", "name", "studentCount"],
      }),
    [modules, moduleSearchQuery],
  );

  const filteredStudents = useMemo(
    () => {
      const matches = filterBySearchQuery(students, studentSearchQuery, {
        fields: ["id", "email", "firstName", "lastName", "active"],
        selectors: [(student) => (student.enrolled ? "assigned" : "unassigned")],
      });

      return matches.sort((a, b) => Number(b.enrolled) - Number(a.enrolled));
    },
    [students, studentSearchQuery],
  );

  const selectedStudentCount = useMemo(
    () => students.reduce((count, student) => count + (student.enrolled ? 1 : 0), 0),
    [students],
  );

  const handleCreateModule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newModuleName.trim();
    if (!name) {
      setCreateMessage("Module name is required.");
      return;
    }

    setIsCreating(true);
    setCreateMessage(null);
    try {
      const created = await createEnterpriseModule({ name });
      setModules((prev) => [created, ...prev]);
      setModulesStatus("success");
      setModulesMessage(`Module "${created.name}" created.`);
      setNewModuleName("");
      setCreateModalOpen(false);
    } catch (err) {
      setCreateMessage(err instanceof Error ? err.message : "Could not create module.");
    } finally {
      setIsCreating(false);
    }
  };

  const openCreateModal = () => {
    setCreateModalOpen(true);
    setCreateMessage(null);
    setNewModuleName("");
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setCreateMessage(null);
    setNewModuleName("");
  };

  const openManageStudents = async (module: EnterpriseModuleRecord) => {
    setSelectedModule(module);
    setStudents([]);
    setStudentsStatus("loading");
    setStudentsMessage(null);
    setStudentSearchQuery("");

    try {
      const response = await listEnterpriseModuleStudents(module.id);
      setSelectedModule(response.module);
      setStudents(response.students);
      setStudentsStatus("success");
      if (response.students.length === 0) {
        setStudentsMessage("No student accounts found in this enterprise.");
      }
    } catch (err) {
      setStudentsStatus("error");
      setStudentsMessage(err instanceof Error ? err.message : "Could not load students.");
    }
  };

  const closeManageStudents = () => {
    setSelectedModule(null);
    setStudents([]);
    setStudentsStatus("idle");
    setStudentsMessage(null);
    setStudentSearchQuery("");
    setIsSavingStudents(false);
  };

  const toggleStudentEnrollment = (studentId: number, nextValue: boolean) => {
    setStudents((prev) =>
      prev.map((student) => (student.id === studentId ? { ...student, enrolled: nextValue } : student)),
    );
  };

  const setFilteredSelection = (nextEnrolled: boolean) => {
    const visibleIds = new Set(filteredStudents.map((student) => student.id));
    setStudents((prev) =>
      prev.map((student) => (visibleIds.has(student.id) ? { ...student, enrolled: nextEnrolled } : student)),
    );
  };

  const saveStudents = async () => {
    if (!selectedModule) return;
    const studentIds = students.filter((student) => student.enrolled).map((student) => student.id);

    setIsSavingStudents(true);
    setStudentsMessage(null);
    try {
      const response = await updateEnterpriseModuleStudents(selectedModule.id, { studentIds });
      setModules((prev) =>
        prev.map((module) =>
          module.id === selectedModule.id ? { ...module, studentCount: response.studentCount } : module,
        ),
      );
      setSelectedModule((prev) => (prev ? { ...prev, studentCount: response.studentCount } : prev));
      setStudentsStatus("success");
      setStudentsMessage("Student assignments saved.");
    } catch (err) {
      setStudentsStatus("error");
      setStudentsMessage(err instanceof Error ? err.message : "Could not save student assignments.");
    } finally {
      setIsSavingStudents(false);
    }
  };

  const moduleRows = filteredModules.map((module) => [
    <div key={`${module.id}-name`} className="ui-stack-xs">
      <strong>{module.name}</strong>
      <span className="muted">Module ID {module.id}</span>
    </div>,
    <span key={`${module.id}-students`}>{module.studentCount}</span>,
    <span key={`${module.id}-created`}>{formatDate(module.createdAt)}</span>,
    <div key={`${module.id}-actions`} className="enterprise-modules__row-actions">
      <Button type="button" variant="ghost" onClick={() => void openManageStudents(module)}>
        Manage students
      </Button>
    </div>,
  ]);

  return (
    <>
      <Card
        title={<span className="overview-title">Module management</span>}
        action={
          <Button type="button" className="enterprise-modules__create-trigger" onClick={openCreateModal}>
            Create module
          </Button>
        }
        className="enterprise-modules__card"
      >
        <p className="muted">Create enterprise modules and assign student accounts to each module.</p>

        <div className="ui-toolbar enterprise-modules__toolbar">
          <FormField
            type="search"
            value={moduleSearchQuery}
            onChange={(event) => setModuleSearchQuery(event.target.value)}
            placeholder="Search modules by name or ID"
            aria-label="Search modules"
            className="enterprise-modules__search"
          />
          <span className="ui-note ui-note--muted">
            {filteredModules.length} module{filteredModules.length === 1 ? "" : "s"}
          </span>
        </div>

        {modulesMessage ? (
          <div
            className={
              modulesStatus === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success"
            }
          >
            <span>{modulesMessage}</span>
          </div>
        ) : null}

        {moduleRows.length > 0 ? (
          <Table
            headers={["Module", "Students", "Created", "Assignment"]}
            rows={moduleRows}
            rowClassName="enterprise-modules__row"
            columnTemplate="1.6fr 0.7fr 0.9fr 1fr"
          />
        ) : (
          <div className="ui-empty-state">
            <p>
              {normalizeSearchQuery(moduleSearchQuery)
                ? `No modules match "${moduleSearchQuery.trim()}".`
                : modulesStatus === "loading"
                  ? "Loading modules..."
                  : "No modules yet. Create your first module above."}
            </p>
          </div>
        )}
      </Card>

      {createModalOpen ? (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="create-module-title" onClick={closeCreateModal}>
          <div
            className="modal__dialog admin-modal ui-content-width enterprise-modules__create-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__header ui-modal-header">
              <div className="ui-stack-sm">
                <h3 id="create-module-title">Create module</h3>
                <p className="muted">Add a module to this enterprise and assign students afterwards.</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="modal__close-btn"
                aria-label="Close"
                onClick={closeCreateModal}
                disabled={isCreating}
              >
                ×
              </Button>
            </div>

            <form className="modal__body admin-modal__body enterprise-modules__create-form" onSubmit={handleCreateModule}>
              <FormField
                value={newModuleName}
                onChange={(event) => setNewModuleName(event.target.value)}
                placeholder="Module name"
                aria-label="Module name"
                required
              />

              {createMessage ? (
                <div className="status-alert status-alert--error">
                  <span>{createMessage}</span>
                </div>
              ) : null}

              <div className="ui-row ui-row--end enterprise-modules__create-actions">
                <Button type="button" variant="ghost" onClick={closeCreateModal} disabled={isCreating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create module"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedModule ? (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="enterprise-module-students-title"
          onClick={closeManageStudents}
        >
          <div
            className="modal__dialog admin-modal ui-content-width enterprise-modules__modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__header ui-modal-header">
              <div className="ui-stack-sm">
                <h3 id="enterprise-module-students-title">Manage students for {selectedModule.name}</h3>
                <p className="muted">
                  Select student accounts to enroll in this module.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="modal__close-btn"
                aria-label="Close"
                onClick={closeManageStudents}
              >
                ×
              </Button>
            </div>

            <div className="modal__body admin-modal__body enterprise-modules__modal-body">
              <div className="ui-toolbar enterprise-modules__modal-toolbar">
                <FormField
                  type="search"
                  value={studentSearchQuery}
                  onChange={(event) => setStudentSearchQuery(event.target.value)}
                  placeholder="Search students by name, email, or ID"
                  aria-label="Search students"
                  className="enterprise-modules__search"
                />
              </div>

              <div className="ui-row ui-row--between enterprise-modules__selection-row">
                <span className="ui-note ui-note--muted">
                  {selectedStudentCount} selected
                </span>
                {filteredStudents.length > 0 ? (
                  <div className="ui-row ui-row--wrap enterprise-modules__bulk-actions">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setFilteredSelection(true)}
                      disabled={studentsStatus === "loading" || isSavingStudents}
                    >
                      Select filtered
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setFilteredSelection(false)}
                      disabled={studentsStatus === "loading" || isSavingStudents}
                    >
                      Clear filtered
                    </Button>
                  </div>
                ) : null}
              </div>

              {studentsMessage ? (
                <div
                  className={
                    studentsStatus === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success"
                  }
                >
                  <span>{studentsMessage}</span>
                </div>
              ) : null}

              {studentsStatus === "loading" ? (
                <span className="ui-note ui-note--muted">Loading students...</span>
              ) : filteredStudents.length > 0 ? (
                <div className="enterprise-modules__student-list">
                  {filteredStudents.map((student) => (
                    <label
                      key={student.id}
                      className={`enterprise-modules__student-item ${student.enrolled ? "is-enrolled" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={student.enrolled}
                        onChange={(event) => toggleStudentEnrollment(student.id, event.target.checked)}
                        disabled={isSavingStudents}
                      />
                      <div className="ui-stack-xs">
                        <strong>{student.email}</strong>
                        <span className="muted">
                          {student.firstName} {student.lastName} • ID {student.id}
                        </span>
                      </div>
                      <span className={student.active ? "status-chip status-chip--success" : "status-chip status-chip--danger"}>
                        {student.active ? "Active" : "Suspended"}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="ui-empty-state">
                  <p>
                    {normalizeSearchQuery(studentSearchQuery)
                      ? `No students match "${studentSearchQuery.trim()}".`
                      : "No student accounts found in this enterprise."}
                  </p>
                </div>
              )}
            </div>

            <div className="modal__footer ui-row ui-row--end">
              <Button type="button" variant="ghost" onClick={closeManageStudents} disabled={isSavingStudents}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void saveStudents()} disabled={isSavingStudents || studentsStatus === "loading"}>
                {isSavingStudents ? "Saving..." : "Save assignments"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
