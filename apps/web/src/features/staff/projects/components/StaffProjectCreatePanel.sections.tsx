import type { Dispatch, SetStateAction } from "react";
import type { Questionnaire } from "@/features/questionnaires/types";
import type { Module } from "@/features/modules/types";
import type { DeadlinePreview, DeadlineState } from "./StaffProjectCreatePanel.deadlines";

type BasicsSectionProps = {
  projectName: string;
  setProjectName: (value: string) => void;
  moduleId: string;
  setModuleId: (value: string) => void;
  templateId: string;
  setTemplateId: (value: string) => void;
  hasCreatableModule: boolean;
  creatableModules: Module[];
  templates: Questionnaire[];
  isLoadingTemplates: boolean;
  hasTemplates: boolean;
};

export function StaffProjectCreateBasicsSection({
  projectName,
  setProjectName,
  moduleId,
  setModuleId,
  templateId,
  setTemplateId,
  hasCreatableModule,
  creatableModules,
  templates,
  isLoadingTemplates,
  hasTemplates,
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
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="e.g. Software Engineering Group Project"
            maxLength={160}
          />
        </label>

        <label className="staff-projects__field">
          <span className="staff-projects__field-label">Module</span>
          <select
            className="staff-projects__select"
            value={moduleId}
            onChange={(event) => setModuleId(event.target.value)}
            disabled={!hasCreatableModule}
          >
            <option value="">Select module</option>
            {creatableModules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.title}
              </option>
            ))}
          </select>
        </label>

        <label className="staff-projects__field">
          <span className="staff-projects__field-label">Questionnaire template</span>
          <select
            className="staff-projects__select"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
            disabled={isLoadingTemplates || !hasTemplates}
          >
            <option value="">
              {isLoadingTemplates ? "Loading templates..." : "Select template"}
            </option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.templateName}
              </option>
            ))}
          </select>
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
                {formatDateTime(deadlinePreview.taskOpenDate)} → {formatDateTime(deadlinePreview.taskDueDate)}
              </p>
            </div>
            <div>
              <p className="staff-projects__field-label">Assessment phase</p>
              <p className="staff-projects__card-sub">
                {formatDateTime(deadlinePreview.assessmentOpenDate)} →{" "}
                {formatDateTime(deadlinePreview.assessmentDueDate)}
              </p>
            </div>
            <div>
              <p className="staff-projects__field-label">Feedback phase</p>
              <p className="staff-projects__card-sub">
                {formatDateTime(deadlinePreview.feedbackOpenDate)} → {formatDateTime(deadlinePreview.feedbackDueDate)}
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
