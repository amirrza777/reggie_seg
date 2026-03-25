"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createStaffProject } from "@/features/projects/api/client";
import { listModules } from "@/features/modules/api/client";
import { getMyQuestionnaires } from "@/features/questionnaires/api/client";
import type { Questionnaire } from "@/features/questionnaires/types";
import type { Module } from "@/features/modules/types";
import { SEARCH_DEBOUNCE_MS } from "@/shared/lib/search";
import { SearchField } from "@/shared/ui/SearchField";

type StaffProjectCreatePanelProps = {
  currentUserId: number;
  modules: Module[];
  modulesError: string | null;
  initialModuleId?: string | null;
};

const CREATABLE_ROLES = new Set<Module["accountRole"]>(["OWNER", "ADMIN_ACCESS"]);

type DeadlineState = {
  taskOpenDate: string;
  taskDueDate: string;
  taskDueDateMcf: string;
  assessmentOpenDate: string;
  assessmentDueDate: string;
  assessmentDueDateMcf: string;
  feedbackOpenDate: string;
  feedbackDueDate: string;
  feedbackDueDateMcf: string;
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
    taskDueDateMcf: toLocalDateTimeInputValue(new Date(taskDue.getTime() + 7 * 24 * 60 * 60 * 1000)),
    assessmentOpenDate: toLocalDateTimeInputValue(assessmentOpen),
    assessmentDueDate: toLocalDateTimeInputValue(assessmentDue),
    assessmentDueDateMcf: toLocalDateTimeInputValue(new Date(assessmentDue.getTime() + 7 * 24 * 60 * 60 * 1000)),
    feedbackOpenDate: toLocalDateTimeInputValue(feedbackOpen),
    feedbackDueDate: toLocalDateTimeInputValue(feedbackDue),
    feedbackDueDateMcf: toLocalDateTimeInputValue(new Date(feedbackDue.getTime() + 7 * 24 * 60 * 60 * 1000)),
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
    taskDueDateMcf: toLocalDateTimeInputValue(new Date(taskDue.getTime() + 7 * 24 * 60 * 60 * 1000)),
    assessmentOpenDate: toLocalDateTimeInputValue(assessmentOpen),
    assessmentDueDate: toLocalDateTimeInputValue(assessmentDue),
    assessmentDueDateMcf: toLocalDateTimeInputValue(new Date(assessmentDue.getTime() + 7 * 24 * 60 * 60 * 1000)),
    feedbackOpenDate: toLocalDateTimeInputValue(feedbackOpen),
    feedbackDueDate: toLocalDateTimeInputValue(feedbackDue),
    feedbackDueDateMcf: toLocalDateTimeInputValue(new Date(feedbackDue.getTime() + 7 * 24 * 60 * 60 * 1000)),
  };
}

export function StaffProjectCreatePanel({
  currentUserId,
  modules,
  modulesError,
  initialModuleId = null,
}: StaffProjectCreatePanelProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Questionnaire[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [moduleId, setModuleId] = useState(initialModuleId ?? "");
  const [moduleSearchQuery, setModuleSearchQuery] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [deadline, setDeadline] = useState<DeadlineState>(() => buildDefaultDeadlineState());
  const [deadlinePresetStatus, setDeadlinePresetStatus] = useState<string | null>(null);
  const [deadlinePresetError, setDeadlinePresetError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moduleSearchError, setModuleSearchError] = useState<string | null>(null);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [selectedTemplateOption, setSelectedTemplateOption] = useState<Questionnaire | null>(null);

  const creatableModulesFromProps = useMemo(
    () => modules.filter((module) => CREATABLE_ROLES.has(module.accountRole)),
    [modules]
  );
  const [moduleOptions, setModuleOptions] = useState<Module[]>(creatableModulesFromProps);

  useEffect(() => {
    if (moduleSearchQuery.trim().length > 0) return;
    setModuleOptions(creatableModulesFromProps);
  }, [creatableModulesFromProps, moduleSearchQuery]);

  useEffect(() => {
    if (!initialModuleId) return;
    if (moduleId.trim().length > 0) return;
    if (!creatableModulesFromProps.some((module) => module.id === initialModuleId)) return;
    setModuleId(initialModuleId);
  }, [creatableModulesFromProps, initialModuleId, moduleId]);

  useEffect(() => {
    const normalizedQuery = moduleSearchQuery.trim();
    if (!normalizedQuery) {
      setModuleSearchError(null);
      setIsLoadingModules(false);
      return;
    }

    let isMounted = true;
    const timer = window.setTimeout(() => {
      setIsLoadingModules(true);
      setModuleSearchError(null);
      listModules(currentUserId, { scope: "staff", compact: true, query: normalizedQuery })
        .then((result) => {
          if (!isMounted) return;
          setModuleOptions(result.filter((module) => CREATABLE_ROLES.has(module.accountRole)));
        })
        .catch((error) => {
          if (!isMounted) return;
          setModuleSearchError(error instanceof Error ? error.message : "Failed to search modules.");
          setModuleOptions([]);
        })
        .finally(() => {
          if (!isMounted) return;
          setIsLoadingModules(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [currentUserId, moduleSearchQuery]);

  useEffect(() => {
    let isMounted = true;
    const normalizedQuery = templateSearchQuery.trim();
    const timer = window.setTimeout(() => {
      setIsLoadingTemplates(true);
      setTemplatesError(null);

      getMyQuestionnaires({ query: normalizedQuery || undefined })
        .then((result) => {
          if (!isMounted) return;
          const sorted = [...result].sort((a, b) => a.templateName.localeCompare(b.templateName));
          setTemplates(sorted);
          if (templateId.trim().length > 0) {
            const selected = sorted.find((template) => String(template.id) === templateId) ?? null;
            if (selected) {
              setSelectedTemplateOption(selected);
            }
          }
        })
        .catch((error) => {
          if (!isMounted) return;
          setTemplatesError(error instanceof Error ? error.message : "Failed to load your questionnaires.");
          setTemplates([]);
        })
        .finally(() => {
          if (!isMounted) return;
          setIsLoadingTemplates(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [templateId, templateSearchQuery]);

  const hasCreatableModule = creatableModulesFromProps.length > 0;
  const hasTemplates = templates.length > 0 || templateId.trim().length > 0;

  const visibleModules = useMemo(() => {
    const selectedModule =
      creatableModulesFromProps.find((module) => module.id === moduleId) ??
      moduleOptions.find((module) => module.id === moduleId);
    if (!selectedModule) return moduleOptions;
    if (moduleOptions.some((module) => module.id === selectedModule.id)) return moduleOptions;
    return [selectedModule, ...moduleOptions];
  }, [creatableModulesFromProps, moduleId, moduleOptions]);

  const visibleTemplates = useMemo(() => {
    const selectedTemplate = templates.find((template) => String(template.id) === templateId) ?? selectedTemplateOption;
    if (!selectedTemplate) return templates;
    if (templates.some((template) => template.id === selectedTemplate.id)) return templates;
    return [selectedTemplate, ...templates];
  }, [selectedTemplateOption, templateId, templates]);

  const canSubmit =
    !isSubmitting &&
    hasCreatableModule &&
    hasTemplates &&
    projectName.trim().length > 0 &&
    moduleId.trim().length > 0 &&
    templateId.trim().length > 0 &&
    deadline.taskOpenDate.trim().length > 0 &&
    deadline.taskDueDate.trim().length > 0 &&
    deadline.taskDueDateMcf.trim().length > 0 &&
    deadline.assessmentOpenDate.trim().length > 0 &&
    deadline.assessmentDueDate.trim().length > 0 &&
    deadline.assessmentDueDateMcf.trim().length > 0 &&
    deadline.feedbackOpenDate.trim().length > 0 &&
    deadline.feedbackDueDate.trim().length > 0 &&
    deadline.feedbackDueDateMcf.trim().length > 0;

  const deadlinePreview = useMemo(() => {
    const taskOpenDate = parseLocalDateTime(deadline.taskOpenDate);
    const taskDueDate = parseLocalDateTime(deadline.taskDueDate);
    const taskDueDateMcf = parseLocalDateTime(deadline.taskDueDateMcf);
    const assessmentOpenDate = parseLocalDateTime(deadline.assessmentOpenDate);
    const assessmentDueDate = parseLocalDateTime(deadline.assessmentDueDate);
    const assessmentDueDateMcf = parseLocalDateTime(deadline.assessmentDueDateMcf);
    const feedbackOpenDate = parseLocalDateTime(deadline.feedbackOpenDate);
    const feedbackDueDate = parseLocalDateTime(deadline.feedbackDueDate);
    const feedbackDueDateMcf = parseLocalDateTime(deadline.feedbackDueDateMcf);

    const rangeStart = taskOpenDate;
    const rangeEnd = feedbackDueDate;
    const totalDays =
      rangeStart && rangeEnd ? Math.max(1, Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000))) : null;

    return {
      taskOpenDate,
      taskDueDate,
      taskDueDateMcf,
      assessmentOpenDate,
      assessmentDueDate,
      assessmentDueDateMcf,
      feedbackOpenDate,
      feedbackDueDate,
      feedbackDueDateMcf,
      totalDays,
    };
  }, [deadline]);

  function applyMcfOffsetDays(offsetDays: number) {
    const taskDueDate = parseLocalDateTime(deadline.taskDueDate);
    const assessmentDueDate = parseLocalDateTime(deadline.assessmentDueDate);
    const feedbackDueDate = parseLocalDateTime(deadline.feedbackDueDate);
    if (!taskDueDate || !assessmentDueDate || !feedbackDueDate) {
      setDeadlinePresetStatus(null);
      setDeadlinePresetError("Set valid standard due dates first, then apply an MCF offset.");
      return;
    }

    const deltaMs = offsetDays * 24 * 60 * 60 * 1000;
    setDeadline((prev) => ({
      ...prev,
      taskDueDateMcf: toLocalDateTimeInputValue(new Date(taskDueDate.getTime() + deltaMs)),
      assessmentDueDateMcf: toLocalDateTimeInputValue(new Date(assessmentDueDate.getTime() + deltaMs)),
      feedbackDueDateMcf: toLocalDateTimeInputValue(new Date(feedbackDueDate.getTime() + deltaMs)),
    }));
    setDeadlinePresetError(null);
    setDeadlinePresetStatus(`Applied MCF +${offsetDays} days to all due dates.`);
  }

  function applySchedulePreset(totalWeeks: number) {
    setDeadline(buildPresetDeadlineState(totalWeeks));
    setDeadlinePresetError(null);
    setDeadlinePresetStatus(`Applied ${totalWeeks}-week project schedule.`);
  }

  function resetSchedulePreset() {
    setDeadline(buildDefaultDeadlineState());
    setDeadlinePresetError(null);
    setDeadlinePresetStatus("Reset to default project schedule.");
  }

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
    const taskDueDateMcf = parseLocalDateTime(deadline.taskDueDateMcf);
    const assessmentOpenDate = parseLocalDateTime(deadline.assessmentOpenDate);
    const assessmentDueDate = parseLocalDateTime(deadline.assessmentDueDate);
    const assessmentDueDateMcf = parseLocalDateTime(deadline.assessmentDueDateMcf);
    const feedbackOpenDate = parseLocalDateTime(deadline.feedbackOpenDate);
    const feedbackDueDate = parseLocalDateTime(deadline.feedbackDueDate);
    const feedbackDueDateMcf = parseLocalDateTime(deadline.feedbackDueDateMcf);

    if (
      !taskOpenDate ||
      !taskDueDate ||
      !taskDueDateMcf ||
      !assessmentOpenDate ||
      !assessmentDueDate ||
      !assessmentDueDateMcf ||
      !feedbackOpenDate ||
      !feedbackDueDate ||
      !feedbackDueDateMcf
    ) {
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
    if (taskDueDateMcf < taskDueDate) {
      setSubmitError("MCF task due must be on or after standard task due.");
      return;
    }
    if (assessmentDueDateMcf < assessmentDueDate) {
      setSubmitError("MCF assessment due must be on or after standard assessment due.");
      return;
    }
    if (feedbackDueDateMcf < feedbackDueDate) {
      setSubmitError("MCF feedback due must be on or after standard feedback due.");
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
          taskDueDateMcf: taskDueDateMcf.toISOString(),
          assessmentOpenDate: assessmentOpenDate.toISOString(),
          assessmentDueDate: assessmentDueDate.toISOString(),
          assessmentDueDateMcf: assessmentDueDateMcf.toISOString(),
          feedbackOpenDate: feedbackOpenDate.toISOString(),
          feedbackDueDate: feedbackDueDate.toISOString(),
          feedbackDueDateMcf: feedbackDueDateMcf.toISOString(),
        },
      });
      setProjectName("");
      setDeadline(buildDefaultDeadlineState());
      setSubmitSuccess(`Project "${created.name}" created.`);
      router.push(`/staff/modules/${created.moduleId}`);
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
            Create projects inside modules you lead. Enterprise admins can also create projects as an override.
            Questionnaire templates define the assessment form used by students.
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
              <SearchField
                className="staff-projects__input"
                value={moduleSearchQuery}
                onChange={(event) => setModuleSearchQuery(event.target.value)}
                placeholder="Search modules by name or ID"
                disabled={!hasCreatableModule}
                aria-label="Search module options"
              />
              <select
                className="staff-projects__select"
                value={moduleId}
                onChange={(event) => setModuleId(event.target.value)}
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
                onChange={(event) => setTemplateSearchQuery(event.target.value)}
                placeholder="Search templates by name or ID"
                disabled={isLoadingTemplates || !hasTemplates}
                aria-label="Search questionnaire template options"
              />
              <select
                className="staff-projects__select"
                value={templateId}
                onChange={(event) => {
                  const nextTemplateId = event.target.value;
                  setTemplateId(nextTemplateId);
                  const nextTemplate = templates.find((template) => String(template.id) === nextTemplateId) ?? null;
                  if (nextTemplate) {
                    setSelectedTemplateOption(nextTemplate);
                  }
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
              {templateSearchQuery.trim().length > 0 && !isLoadingTemplates && visibleTemplates.length === 0 ? (
                <span className="staff-projects__field-label">No templates match "{templateSearchQuery.trim()}".</span>
              ) : null}
            </label>
          </div>
        </section>

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
      {moduleSearchError ? <p className="staff-projects__error">{moduleSearchError}</p> : null}
      {templatesError ? <p className="staff-projects__error">{templatesError}</p> : null}
      {!hasCreatableModule && !modulesError ? (
        <p className="staff-projects__hint">
          You need module-lead access to create projects in this enterprise. Enterprise admins can override this.
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
