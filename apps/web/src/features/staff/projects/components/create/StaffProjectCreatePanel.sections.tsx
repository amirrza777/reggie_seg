import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import type { Questionnaire } from "@/features/questionnaires/types";
import type { Module } from "@/features/modules/types";
import { SearchField } from "@/shared/ui/SearchField";
import { ArrowRightIcon } from "@/shared/ui/icons/ArrowRightIcon";
import type { DeadlinePreview, DeadlineState } from "./StaffProjectCreatePanel.deadlines";

type BasicsSectionProps = {
  projectName: string;
  onProjectNameChange: (value: string) => void;
  moduleId: string;
  onModuleIdChange: (value: string) => void;
  moduleSearchQuery: string;
  onModuleSearchQueryChange: (value: string) => void;
  templateId: string;
  onTemplateIdChange: (value: string) => void;
  templateSearchQuery: string;
  onTemplateSearchQueryChange: (value: string) => void;
  hasCreatableModule: boolean;
  visibleModules: Module[];
  hasTemplates: boolean;
  visibleTemplates: Questionnaire[];
  isLoadingModules: boolean;
  isLoadingTemplates: boolean;
};

export function StaffProjectCreateBasicsSection({
  projectName,
  onProjectNameChange,
  moduleId,
  onModuleIdChange,
  moduleSearchQuery,
  onModuleSearchQueryChange,
  templateId,
  onTemplateIdChange,
  templateSearchQuery,
  onTemplateSearchQueryChange,
  hasCreatableModule,
  visibleModules,
  hasTemplates,
  visibleTemplates,
  isLoadingModules,
  isLoadingTemplates,
}: BasicsSectionProps) {
  return (
    <section className="staff-projects__create-basics" aria-label="Project basics">
      <div className="staff-projects__section-head">
        <p className="staff-projects__eyebrow">Step 1</p>
        <h3 className="staff-projects__section-title">Project details</h3>
        <p className="staff-projects__hint">Pick where this project lives and which questionnaire it uses.</p>
      </div>
      <div className="staff-projects__create-basics-grid">
        <label className="staff-projects__field">
          <span className="staff-projects__field-label">Project name</span>
          <input
            className="staff-projects__input"
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            placeholder="e.g. Software Engineering Group Project"
            maxLength={160}
          />
        </label>

        <label className="staff-projects__field">
          <span className="staff-projects__field-label">Module</span>
          <SearchField
            className="staff-projects__input"
            value={moduleSearchQuery}
            onChange={(event) => onModuleSearchQueryChange(event.target.value)}
            placeholder="Search modules by name or ID"
            disabled={!hasCreatableModule}
            aria-label="Search module options"
          />
          <select
            className="staff-projects__select"
            value={moduleId}
            onChange={(event) => onModuleIdChange(event.target.value)}
            disabled={!hasCreatableModule || isLoadingModules}
          >
            <option value="">Select module</option>
            {visibleModules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.title}
              </option>
            ))}
          </select>
          {moduleSearchQuery.trim().length > 0 && !isLoadingModules && visibleModules.length === 0 ? (
            <span className="staff-projects__field-label">No modules match "{moduleSearchQuery.trim()}".</span>
          ) : null}
        </label>

        <label className="staff-projects__field">
          <span className="staff-projects__field-label">Questionnaire template</span>
          <SearchField
            className="staff-projects__input"
            value={templateSearchQuery}
            onChange={(event) => onTemplateSearchQueryChange(event.target.value)}
            placeholder="Search templates by name or ID"
            disabled={isLoadingTemplates || !hasTemplates}
            aria-label="Search questionnaire template options"
          />
          <select
            className="staff-projects__select"
            value={templateId}
            onChange={(event) => onTemplateIdChange(event.target.value)}
            disabled={isLoadingTemplates || !hasTemplates}
          >
            <option value="">{isLoadingTemplates ? "Loading templates..." : "Select template"}</option>
            {visibleTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.templateName}
              </option>
            ))}
          </select>
          {templateSearchQuery.trim().length > 0 && !isLoadingTemplates && visibleTemplates.length === 0 ? (
            <span className="staff-projects__field-label">No templates match "{templateSearchQuery.trim()}".</span>
          ) : null}
        </label>
      </div>
    </section>
  );
}

type DeadlinesSectionProps = {
  deadline: DeadlineState;
  setDeadline: Dispatch<SetStateAction<DeadlineState>>;
  applySchedulePreset: (totalWeeks: number) => void;
  resetSchedulePreset: () => void;
  applyMcfOffsetDays: (offsetDays: number) => void;
  deadlinePresetStatus: string | null;
  deadlinePresetError: string | null;
  deadlinePreview: DeadlinePreview;
  formatDateTime: (date: Date | null) => string;
};

export function StaffProjectCreateDeadlinesSection({
  deadline,
  setDeadline,
  applySchedulePreset,
  resetSchedulePreset,
  applyMcfOffsetDays,
  deadlinePresetStatus,
  deadlinePresetError,
  deadlinePreview,
  formatDateTime,
}: DeadlinesSectionProps) {
  return (
    <fieldset className="staff-projects__deadline">
      <legend className="staff-projects__field-label">Project deadlines</legend>
      <div className="staff-projects__section-head">
        <p className="staff-projects__eyebrow">Step 2</p>
        <h3 className="staff-projects__section-title">Timeline setup</h3>
        <p className="staff-projects__hint">
          Set standard cohort deadlines and separate MCF due dates. Team and student overrides can be applied later.
        </p>
      </div>
      <div className="staff-projects__deadline-presets">
        <div className="staff-projects__deadline-preset-group">
          <p className="staff-projects__field-label" style={{ margin: 0 }}>
            Schedule presets
          </p>
          <div className="staff-projects__deadline-preset-actions">
            <button type="button" className="staff-projects__chip-btn" onClick={() => applySchedulePreset(6)}>
              Use 6-week schedule
            </button>
            <button type="button" className="staff-projects__chip-btn" onClick={() => applySchedulePreset(8)}>
              Use 8-week schedule
            </button>
            <button type="button" className="staff-projects__chip-btn" onClick={resetSchedulePreset}>
              Reset dates
            </button>
          </div>
        </div>

        <div className="staff-projects__deadline-preset-group">
          <p className="staff-projects__field-label" style={{ margin: 0 }}>
            MCF due-date offset
          </p>
          <div className="staff-projects__deadline-preset-actions">
            <button type="button" className="staff-projects__chip-btn" onClick={() => applyMcfOffsetDays(7)}>
              Set MCF +7 days
            </button>
            <button type="button" className="staff-projects__chip-btn" onClick={() => applyMcfOffsetDays(14)}>
              Set MCF +14 days
            </button>
          </div>
        </div>
      </div>

      {deadlinePresetStatus ? <p className="staff-projects__success">{deadlinePresetStatus}</p> : null}
      {deadlinePresetError ? <p className="staff-projects__error">{deadlinePresetError}</p> : null}

      <div className="staff-projects__deadline-sections">
        <section className="staff-projects__deadline-block" aria-label="Standard timeline">
          <p className="staff-projects__field-label" style={{ margin: 0 }}>
            Standard timeline
          </p>
          <div className="staff-projects__deadline-grid">
            <label className="staff-projects__field">
              <span className="staff-projects__field-label">Task opens</span>
              <input
                className="staff-projects__input"
                type="datetime-local"
                value={deadline.taskOpenDate}
                onChange={(event) => setDeadline((prev) => ({ ...prev, taskOpenDate: event.target.value }))}
              />
            </label>
            <label className="staff-projects__field">
              <span className="staff-projects__field-label">Task due</span>
              <input
                className="staff-projects__input"
                type="datetime-local"
                value={deadline.taskDueDate}
                onChange={(event) => setDeadline((prev) => ({ ...prev, taskDueDate: event.target.value }))}
              />
            </label>
            <label className="staff-projects__field">
              <span className="staff-projects__field-label">Assessment opens</span>
              <input
                className="staff-projects__input"
                type="datetime-local"
                value={deadline.assessmentOpenDate}
                onChange={(event) => setDeadline((prev) => ({ ...prev, assessmentOpenDate: event.target.value }))}
              />
            </label>
            <label className="staff-projects__field">
              <span className="staff-projects__field-label">Assessment due</span>
              <input
                className="staff-projects__input"
                type="datetime-local"
                value={deadline.assessmentDueDate}
                onChange={(event) => setDeadline((prev) => ({ ...prev, assessmentDueDate: event.target.value }))}
              />
            </label>
            <label className="staff-projects__field">
              <span className="staff-projects__field-label">Feedback opens</span>
              <input
                className="staff-projects__input"
                type="datetime-local"
                value={deadline.feedbackOpenDate}
                onChange={(event) => setDeadline((prev) => ({ ...prev, feedbackOpenDate: event.target.value }))}
              />
            </label>
            <label className="staff-projects__field">
              <span className="staff-projects__field-label">Feedback due</span>
              <input
                className="staff-projects__input"
                type="datetime-local"
                value={deadline.feedbackDueDate}
                onChange={(event) => setDeadline((prev) => ({ ...prev, feedbackDueDate: event.target.value }))}
              />
            </label>
          </div>
        </section>

        <section className="staff-projects__deadline-block" aria-label="MCF extension timeline">
          <p className="staff-projects__field-label" style={{ margin: 0 }}>
            MCF extension due dates
          </p>
          <div className="staff-projects__deadline-grid">
            <label className="staff-projects__field">
              <span className="staff-projects__field-label">MCF task due</span>
              <input
                className="staff-projects__input"
                type="datetime-local"
                value={deadline.taskDueDateMcf}
                onChange={(event) => setDeadline((prev) => ({ ...prev, taskDueDateMcf: event.target.value }))}
              />
            </label>
            <label className="staff-projects__field">
              <span className="staff-projects__field-label">MCF assessment due</span>
              <input
                className="staff-projects__input"
                type="datetime-local"
                value={deadline.assessmentDueDateMcf}
                onChange={(event) => setDeadline((prev) => ({ ...prev, assessmentDueDateMcf: event.target.value }))}
              />
            </label>
            <label className="staff-projects__field">
              <span className="staff-projects__field-label">MCF feedback due</span>
              <input
                className="staff-projects__input"
                type="datetime-local"
                value={deadline.feedbackDueDateMcf}
                onChange={(event) => setDeadline((prev) => ({ ...prev, feedbackDueDateMcf: event.target.value }))}
              />
            </label>
          </div>
        </section>

        <section className="staff-projects__deadline-preview staff-projects__deadline-preview--wide">
          <h3 className="staff-projects__deadline-preview-title">Timeline preview</h3>
          <p className="staff-projects__hint">
            Total project window:{" "}
            {deadlinePreview.totalDays
              ? `${deadlinePreview.totalDays} day${deadlinePreview.totalDays === 1 ? "" : "s"}`
              : "-"}
          </p>
          <div className="staff-projects__deadline-preview-grid">
            <div>
              <p className="staff-projects__field-label">Task phase</p>
              <p className="staff-projects__card-sub">
                {formatDateTime(deadlinePreview.taskOpenDate)} <ArrowRightIcon /> {formatDateTime(deadlinePreview.taskDueDate)}
              </p>
            </div>
            <div>
              <p className="staff-projects__field-label">Assessment phase</p>
              <p className="staff-projects__card-sub">
                {formatDateTime(deadlinePreview.assessmentOpenDate)} <ArrowRightIcon /> {formatDateTime(deadlinePreview.assessmentDueDate)}
              </p>
            </div>
            <div>
              <p className="staff-projects__field-label">Feedback phase</p>
              <p className="staff-projects__card-sub">
                {formatDateTime(deadlinePreview.feedbackOpenDate)} <ArrowRightIcon /> {formatDateTime(deadlinePreview.feedbackDueDate)}
              </p>
            </div>
            <div>
              <p className="staff-projects__field-label">MCF task due</p>
              <p className="staff-projects__card-sub">{formatDateTime(deadlinePreview.taskDueDateMcf)}</p>
            </div>
            <div>
              <p className="staff-projects__field-label">MCF assessment due</p>
              <p className="staff-projects__card-sub">{formatDateTime(deadlinePreview.assessmentDueDateMcf)}</p>
            </div>
            <div>
              <p className="staff-projects__field-label">MCF feedback due</p>
              <p className="staff-projects__card-sub">{formatDateTime(deadlinePreview.feedbackDueDateMcf)}</p>
            </div>
          </div>
        </section>
      </div>
    </fieldset>
  );
}

type InformationSectionProps = {
  informationText: string;
  onInformationTextChange: (value: string) => void;
};

export function StaffProjectCreateInformationSection({
  informationText,
  onInformationTextChange,
}: InformationSectionProps) {
  return (
    <section className="staff-projects__create-basics" aria-label="Information board setup">
      <div className="staff-projects__section-head">
        <p className="staff-projects__eyebrow">Step 3</p>
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
          onChange={(event) => onInformationTextChange(event.target.value)}
          placeholder="Add project expectations, process notes, and any key instructions for this cohort."
          rows={6}
          maxLength={8000}
        />
      </label>
    </section>
  );
}

type ActionsSectionProps = {
  canSubmit: boolean;
  isSubmitting: boolean;
};

export function StaffProjectCreateActionsSection({ canSubmit, isSubmitting }: ActionsSectionProps) {
  return (
    <div className="staff-projects__create-actions">
      <button className="staff-projects__create-submit" type="submit" disabled={!canSubmit}>
        {isSubmitting ? "Creating..." : "Create project"}
      </button>
      <Link href="/staff/questionnaires/new" className="staff-projects__create-link">
        Create questionnaire
      </Link>
    </div>
  );
}
