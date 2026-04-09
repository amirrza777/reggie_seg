"use client";

import Link from "next/link";
import type { Module } from "@/features/modules/types";
import { useStaffProjectCreatePanel } from "./useStaffProjectCreatePanel";
import { StaffProjectCreatePanelDeadlineForm } from "./StaffProjectCreatePanel.deadline-form";
import { StaffProjectCreatePanelStudentPicker } from "./StaffProjectCreatePanel.student-picker";

type StaffProjectCreatePanelProps = {
  modules: Module[];
  modulesError: string | null;
  initialModuleId?: string | null;
};

export function StaffProjectCreatePanel({
  modules,
  modulesError,
  initialModuleId,
}: StaffProjectCreatePanelProps) {
  const {
    isLoadingTemplates, templatesError,
    isLoadingAllocationTemplates, allocationTemplatesError,
    projectName, setProjectName,
    informationText, setInformationText,
    templateId, setTemplateId, setSelectedTemplateOption,
    allocationTemplateId, setAllocationTemplateId, setSelectedAllocationTemplateOption,
    deadline, setDeadline,
    deadlinePresetStatus, deadlinePresetError,
    submitError, submitSuccess, isSubmitting,
    isLoadingModuleStudents, moduleStudentsError,
    studentSearchInput,
    selectedStudentIds,
    creatableModulesFromProps,
    hasCreatableModule, hasTemplates, hasAllocationTemplates, hasSelectedAllocationTemplate,
    selectedModule, hasModuleSelection,
    visibleTemplates, visibleAllocationTemplates,
    enrolledModuleStudents, filteredModuleStudents,
    canSubmit,
    deadlinePreview,
    applyMcfOffsetDays, applySchedulePreset, resetSchedulePreset,
    selectAllModuleStudents, clearSelectedModuleStudents, toggleStudentSelection,
    handleStudentSearchChange, refreshModuleStudents,
    onSubmit,
  } = useStaffProjectCreatePanel({ modules, modulesError, initialModuleId });

  return (
    <section className="staff-projects__create" aria-label="Create project">
      <div className="staff-projects__create-head">
        <div>
          <p className="staff-projects__eyebrow">Project Setup</p>
          <h2 className="staff-projects__create-title">Create New Project</h2>
          <p className="staff-projects__desc">
            Create projects inside modules you lead. Enterprise admins can also create projects as an override.
            Peer-assessment questionnaires define the assessment form used by students.
            Optional team allocation questionnaires let staff run questionnaire-based team allocations.
          </p>
        </div>
        <span className="staff-projects__badge">
          {creatableModulesFromProps.length} creatable module{creatableModulesFromProps.length === 1 ? "" : "s"}
        </span>
      </div>

      <form className="staff-projects__create-form" onSubmit={onSubmit}>
        <section className="staff-projects__create-basics" aria-label="Project basics">
          <div className="staff-projects__section-head">
            <p className="staff-projects__eyebrow">Step 1</p>
            <h3 className="staff-projects__section-title">Project details</h3>
            <p className="staff-projects__hint">
              This project will be created in the current module. Select a peer-assessment questionnaire and optional
              team allocation questionnaire.
            </p>
          </div>
          <div className="staff-projects__create-basics-grid">
            <label className="staff-projects__field">
              <span className="staff-projects__field-label">Project name</span>
              <input
                className="staff-projects__input"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="e.g. Software Engineering Group Project"
                maxLength={160}
              />
            </label>

            <label className="staff-projects__field">
              <span className="staff-projects__field-label">Module</span>
              <input
                className="staff-projects__input"
                value={selectedModule ? selectedModule.title : "No module available"}
                disabled
                aria-label="Selected module"
              />
              <p className="staff-projects__hint">
                Module is set automatically from your current workspace.
              </p>
            </label>

            <label className="staff-projects__field">
              <span className="staff-projects__field-label">Peer assessment questionnaire template</span>
              <select
                className="staff-projects__select"
                value={templateId}
                onChange={(event) => {
                  const nextTemplateId = event.target.value;
                  setTemplateId(nextTemplateId);
                  const nextTemplate = visibleTemplates.find((t) => String(t.id) === nextTemplateId) ?? null;
                  if (nextTemplate) setSelectedTemplateOption(nextTemplate);
                }}
                disabled={isLoadingTemplates || !hasTemplates}
              >
                <option value="">
                  {isLoadingTemplates ? "Loading templates..." : "Select template"}
                </option>
                {visibleTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.templateName}
                  </option>
                ))}
              </select>
              {!isLoadingTemplates && !hasTemplates ? (
                <Link href="/staff/questionnaires/new" className="staff-projects__create-link">
                  Create questionnaire
                </Link>
              ) : null}
            </label>

            <label className="staff-projects__field">
              <span className="staff-projects__field-label">Team allocation questionnaire (optional)</span>
              <select
                className="staff-projects__select"
                value={allocationTemplateId}
                onChange={(event) => {
                  const nextTemplateId = event.target.value;
                  setAllocationTemplateId(nextTemplateId);
                  const nextTemplate = visibleAllocationTemplates.find((t) => String(t.id) === nextTemplateId) ?? null;
                  if (nextTemplate) setSelectedAllocationTemplateOption(nextTemplate);
                }}
                disabled={isLoadingAllocationTemplates || !hasAllocationTemplates}
              >
                <option value="">
                  {isLoadingAllocationTemplates ? "Loading templates..." : "No team allocation questionnaire"}
                </option>
                {visibleAllocationTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.templateName}
                  </option>
                ))}
              </select>
              <p className="staff-projects__hint">
                If selected, students cannot create their own teams and staff can run questionnaire-based allocations.
              </p>
              {!isLoadingAllocationTemplates && !hasAllocationTemplates ? (
                <Link href="/staff/questionnaires/new" className="staff-projects__create-link">
                  Create questionnaire
                </Link>
              ) : null}
            </label>
          </div>
        </section>

        <StaffProjectCreatePanelDeadlineForm
          deadline={deadline}
          setDeadline={setDeadline}
          deadlinePreview={deadlinePreview}
          deadlinePresetStatus={deadlinePresetStatus}
          deadlinePresetError={deadlinePresetError}
          hasSelectedAllocationTemplate={hasSelectedAllocationTemplate}
          onApplyMcfOffsetDays={applyMcfOffsetDays}
          onApplySchedulePreset={applySchedulePreset}
          onResetSchedulePreset={resetSchedulePreset}
        />

        <section className="staff-projects__create-basics" aria-label="Project students">
          <div className="staff-projects__section-head">
            <p className="staff-projects__eyebrow">Step 3</p>
            <h3 className="staff-projects__section-title">Project students</h3>
            <p className="staff-projects__hint">
              Choose which enrolled students should be available for team allocation in this project.
            </p>
          </div>
          {!hasModuleSelection ? (
            <p className="staff-projects__hint">
              No valid module context is available for project creation right now.
            </p>
          ) : (
            <StaffProjectCreatePanelStudentPicker
              enrolledModuleStudents={enrolledModuleStudents}
              filteredModuleStudents={filteredModuleStudents}
              selectedStudentIds={selectedStudentIds}
              studentSearchInput={studentSearchInput}
              isLoadingModuleStudents={isLoadingModuleStudents}
              moduleStudentsError={moduleStudentsError}
              onRefresh={refreshModuleStudents}
              onSelectAll={selectAllModuleStudents}
              onClearSelection={clearSelectedModuleStudents}
              onToggleStudent={toggleStudentSelection}
              onSearchChange={handleStudentSearchChange}
            />
          )}
        </section>

        <section className="staff-projects__create-basics" aria-label="Information board setup">
          <div className="staff-projects__section-head">
            <p className="staff-projects__eyebrow">Step 4</p>
            <h3 className="staff-projects__section-title">Information board</h3>
            <p className="staff-projects__hint">
              Add project-specific guidance students will see on the project overview information board.
            </p>
          </div>
          <label className="staff-projects__field">
            <span className="staff-projects__field-label">Information board text</span>
            <textarea
              className="staff-projects__input staff-projects__textarea"
              value={informationText}
              onChange={(event) => setInformationText(event.target.value)}
              placeholder="Add project expectations, process notes, and any key instructions for this cohort."
              rows={6}
              maxLength={8000}
            />
          </label>
        </section>

        <div className="staff-projects__create-actions">
          <button className="staff-projects__create-submit" type="submit" disabled={!canSubmit}>
            {isSubmitting ? "Creating..." : "Create project"}
          </button>
        </div>
      </form>

      {modulesError ? <p className="staff-projects__error">{modulesError}</p> : null}
      {templatesError ? <p className="staff-projects__error">{templatesError}</p> : null}
      {allocationTemplatesError ? <p className="staff-projects__error">{allocationTemplatesError}</p> : null}
      {!hasCreatableModule && !modulesError ? (
        <p className="staff-projects__hint">
          You need module-lead access to create projects in this enterprise. Enterprise admins can override this.
        </p>
      ) : null}
      {!isLoadingTemplates && !hasTemplates && !templatesError ? (
        <p className="staff-projects__hint">
          You do not have any peer-assessment questionnaires yet. Create one first.
        </p>
      ) : null}
      {!isLoadingAllocationTemplates && !hasAllocationTemplates && !allocationTemplatesError ? (
        <p className="staff-projects__hint">
          No team allocation questionnaires found yet. This step is optional.
        </p>
      ) : null}
      {submitError ? <p className="staff-projects__error">{submitError}</p> : null}
      {submitSuccess ? <p className="staff-projects__success">{submitSuccess}</p> : null}
    </section>
  );
}