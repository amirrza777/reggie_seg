"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createStaffProject } from "@/features/projects/api/client";
import { getMyQuestionnaires } from "@/features/questionnaires/api/client";
import type { Questionnaire } from "@/features/questionnaires/types";
import type { Module } from "@/features/modules/types";

type StaffProjectCreatePanelProps = {
  modules: Module[];
  modulesError: string | null;
};

const CREATABLE_ROLES = new Set<Module["accountRole"]>(["OWNER"]);

type DeadlineState = {
  taskOpenDate: string;
  taskDueDate: string;
  assessmentOpenDate: string;
  assessmentDueDate: string;
  feedbackOpenDate: string;
  feedbackDueDate: string;
};

function toLocalDateTimeInputValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function buildDefaultDeadlineState(): DeadlineState {
  const taskOpen = new Date();
  taskOpen.setMinutes(0, 0, 0);
  taskOpen.setHours(taskOpen.getHours() + 1);

  const taskDue = new Date(taskOpen.getTime() + 14 * 24 * 60 * 60 * 1000);
  const assessmentOpen = new Date(taskDue.getTime() + 24 * 60 * 60 * 1000);
  const assessmentDue = new Date(assessmentOpen.getTime() + 4 * 24 * 60 * 60 * 1000);
  const feedbackOpen = new Date(assessmentDue.getTime() + 24 * 60 * 60 * 1000);
  const feedbackDue = new Date(feedbackOpen.getTime() + 4 * 24 * 60 * 60 * 1000);

  return {
    taskOpenDate: toLocalDateTimeInputValue(taskOpen),
    taskDueDate: toLocalDateTimeInputValue(taskDue),
    assessmentOpenDate: toLocalDateTimeInputValue(assessmentOpen),
    assessmentDueDate: toLocalDateTimeInputValue(assessmentDue),
    feedbackOpenDate: toLocalDateTimeInputValue(feedbackOpen),
    feedbackDueDate: toLocalDateTimeInputValue(feedbackDue),
  };
}

function parseLocalDateTime(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDateTime(date: Date | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function buildPresetDeadlineState(totalWeeks: number): DeadlineState {
  const taskOpen = new Date();
  taskOpen.setMinutes(0, 0, 0);
  taskOpen.setHours(taskOpen.getHours() + 1);

  const taskDue = new Date(taskOpen.getTime() + totalWeeks * 7 * 24 * 60 * 60 * 1000);
  const assessmentOpen = new Date(taskDue.getTime() + 24 * 60 * 60 * 1000);
  const assessmentDue = new Date(assessmentOpen.getTime() + 5 * 24 * 60 * 60 * 1000);
  const feedbackOpen = new Date(assessmentDue.getTime() + 24 * 60 * 60 * 1000);
  const feedbackDue = new Date(feedbackOpen.getTime() + 5 * 24 * 60 * 60 * 1000);

  return {
    taskOpenDate: toLocalDateTimeInputValue(taskOpen),
    taskDueDate: toLocalDateTimeInputValue(taskDue),
    assessmentOpenDate: toLocalDateTimeInputValue(assessmentOpen),
    assessmentDueDate: toLocalDateTimeInputValue(assessmentDue),
    feedbackOpenDate: toLocalDateTimeInputValue(feedbackOpen),
    feedbackDueDate: toLocalDateTimeInputValue(feedbackDue),
  };
}

export function StaffProjectCreatePanel({ modules, modulesError }: StaffProjectCreatePanelProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Questionnaire[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [deadline, setDeadline] = useState<DeadlineState>(() => buildDefaultDeadlineState());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const creatableModules = useMemo(
    () => modules.filter((module) => CREATABLE_ROLES.has(module.accountRole)),
    [modules]
  );

  useEffect(() => {
    let isMounted = true;
    setIsLoadingTemplates(true);
    setTemplatesError(null);

    getMyQuestionnaires()
      .then((result) => {
        if (!isMounted) return;
        const sorted = [...result].sort((a, b) => a.templateName.localeCompare(b.templateName));
        setTemplates(sorted);
      })
      .catch((error) => {
        if (!isMounted) return;
        setTemplatesError(error instanceof Error ? error.message : "Failed to load your questionnaires.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoadingTemplates(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const hasCreatableModule = creatableModules.length > 0;
  const hasTemplates = templates.length > 0;
  const canSubmit =
    !isSubmitting &&
    hasCreatableModule &&
    hasTemplates &&
    projectName.trim().length > 0 &&
    moduleId.trim().length > 0 &&
    templateId.trim().length > 0 &&
    deadline.taskOpenDate.trim().length > 0 &&
    deadline.taskDueDate.trim().length > 0 &&
    deadline.assessmentOpenDate.trim().length > 0 &&
    deadline.assessmentDueDate.trim().length > 0 &&
    deadline.feedbackOpenDate.trim().length > 0 &&
    deadline.feedbackDueDate.trim().length > 0;

  const deadlinePreview = useMemo(() => {
    const taskOpenDate = parseLocalDateTime(deadline.taskOpenDate);
    const taskDueDate = parseLocalDateTime(deadline.taskDueDate);
    const assessmentOpenDate = parseLocalDateTime(deadline.assessmentOpenDate);
    const assessmentDueDate = parseLocalDateTime(deadline.assessmentDueDate);
    const feedbackOpenDate = parseLocalDateTime(deadline.feedbackOpenDate);
    const feedbackDueDate = parseLocalDateTime(deadline.feedbackDueDate);

    const rangeStart = taskOpenDate;
    const rangeEnd = feedbackDueDate;
    const totalDays =
      rangeStart && rangeEnd ? Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000))) : null;

    return {
      taskOpenDate,
      taskDueDate,
      assessmentOpenDate,
      assessmentDueDate,
      feedbackOpenDate,
      feedbackDueDate,
      totalDays,
    };
  }, [deadline]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const parsedModuleId = Number(moduleId);
    const parsedTemplateId = Number(templateId);
    if (!Number.isInteger(parsedModuleId) || !Number.isInteger(parsedTemplateId)) {
      setSubmitError("Please choose a valid module and questionnaire template.");
      return;
    }

    const taskOpenDate = parseLocalDateTime(deadline.taskOpenDate);
    const taskDueDate = parseLocalDateTime(deadline.taskDueDate);
    const assessmentOpenDate = parseLocalDateTime(deadline.assessmentOpenDate);
    const assessmentDueDate = parseLocalDateTime(deadline.assessmentDueDate);
    const feedbackOpenDate = parseLocalDateTime(deadline.feedbackOpenDate);
    const feedbackDueDate = parseLocalDateTime(deadline.feedbackDueDate);

    if (!taskOpenDate || !taskDueDate || !assessmentOpenDate || !assessmentDueDate || !feedbackOpenDate || !feedbackDueDate) {
      setSubmitError("All deadline fields must be valid dates.");
      return;
    }

    if (taskOpenDate >= taskDueDate) {
      setSubmitError("Task open must be before task due.");
      return;
    }
    if (taskDueDate > assessmentOpenDate) {
      setSubmitError("Assessment open must be on or after task due.");
      return;
    }
    if (assessmentOpenDate >= assessmentDueDate) {
      setSubmitError("Assessment open must be before assessment due.");
      return;
    }
    if (assessmentDueDate > feedbackOpenDate) {
      setSubmitError("Feedback open must be on or after assessment due.");
      return;
    }
    if (feedbackOpenDate >= feedbackDueDate) {
      setSubmitError("Feedback open must be before feedback due.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const created = await createStaffProject({
        name: projectName.trim(),
        moduleId: parsedModuleId,
        questionnaireTemplateId: parsedTemplateId,
        deadline: {
          taskOpenDate: taskOpenDate.toISOString(),
          taskDueDate: taskDueDate.toISOString(),
          assessmentOpenDate: assessmentOpenDate.toISOString(),
          assessmentDueDate: assessmentDueDate.toISOString(),
          feedbackOpenDate: feedbackOpenDate.toISOString(),
          feedbackDueDate: feedbackDueDate.toISOString(),
        },
      });
      setProjectName("");
      setDeadline(buildDefaultDeadlineState());
      setSubmitSuccess(`Project "${created.name}" created.`);
      router.push(`/staff/projects/${created.id}`);
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create project.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="staff-projects__create" aria-label="Create project">
      <div className="staff-projects__create-head">
        <div>
          <p className="staff-projects__eyebrow">Project Setup</p>
          <h2 className="staff-projects__create-title">Create New Project</h2>
          <p className="staff-projects__desc">
            Create projects inside modules you lead. Questionnaire templates define the assessment form used by students.
          </p>
        </div>
        <span className="staff-projects__badge">{creatableModules.length} creatable module{creatableModules.length === 1 ? "" : "s"}</span>
      </div>

      <form className="staff-projects__create-form" onSubmit={onSubmit}>
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

        <fieldset className="staff-projects__deadline">
          <legend className="staff-projects__field-label">Project deadlines</legend>
          <p className="staff-projects__hint">
            Deadlines are set when creating the project. Team-specific overrides can be applied later if needed.
          </p>
          <div className="staff-projects__deadline-presets">
            <button
              type="button"
              className="staff-projects__badge"
              onClick={() => setDeadline(buildPresetDeadlineState(6))}
            >
              Use 6-week schedule
            </button>
            <button
              type="button"
              className="staff-projects__badge"
              onClick={() => setDeadline(buildPresetDeadlineState(8))}
            >
              Use 8-week schedule
            </button>
            <button
              type="button"
              className="staff-projects__badge"
              onClick={() => setDeadline(buildDefaultDeadlineState())}
            >
              Reset dates
            </button>
          </div>
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
          <div className="staff-projects__deadline-preview">
            <h3 className="staff-projects__deadline-preview-title">Timeline preview</h3>
            <p className="staff-projects__hint">
              Total project window: {deadlinePreview.totalDays ? `${deadlinePreview.totalDays} day${deadlinePreview.totalDays === 1 ? "" : "s"}` : "-"}
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
                  {formatDateTime(deadlinePreview.assessmentOpenDate)} → {formatDateTime(deadlinePreview.assessmentDueDate)}
                </p>
              </div>
              <div>
                <p className="staff-projects__field-label">Feedback phase</p>
                <p className="staff-projects__card-sub">
                  {formatDateTime(deadlinePreview.feedbackOpenDate)} → {formatDateTime(deadlinePreview.feedbackDueDate)}
                </p>
              </div>
            </div>
          </div>
        </fieldset>

        <div className="staff-projects__create-actions">
          <button className="staff-projects__create-submit" type="submit" disabled={!canSubmit}>
            {isSubmitting ? "Creating..." : "Create project"}
          </button>
          <Link href="/staff/questionnaires/new" className="staff-projects__create-link">
            Create questionnaire
          </Link>
        </div>
      </form>

      {modulesError ? <p className="staff-projects__error">{modulesError}</p> : null}
      {templatesError ? <p className="staff-projects__error">{templatesError}</p> : null}
      {!hasCreatableModule && !modulesError ? (
        <p className="staff-projects__hint">
          You need module-lead access to create projects in this enterprise.
        </p>
      ) : null}
      {!isLoadingTemplates && !hasTemplates && !templatesError ? (
        <p className="staff-projects__hint">
          You do not have any questionnaire templates yet. Create one first.
        </p>
      ) : null}
      {submitError ? <p className="staff-projects__error">{submitError}</p> : null}
      {submitSuccess ? <p className="staff-projects__success">{submitSuccess}</p> : null}
    </section>
  );
}
