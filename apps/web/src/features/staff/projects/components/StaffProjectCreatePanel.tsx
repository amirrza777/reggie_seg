"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createStaffProject } from "@/features/projects/api/client";
import { getMyQuestionnaires } from "@/features/questionnaires/api/client";
import type { Questionnaire } from "@/features/questionnaires/types";
import type { Module } from "@/features/modules/types";
import {
  applyMcfOffsetDaysToDeadlineState,
  buildDeadlinePreview,
  buildDefaultDeadlineState,
  buildPresetDeadlineState,
  formatDateTime,
  parseAndValidateDeadlineState,
  type DeadlineState,
} from "./StaffProjectCreatePanel.deadlines";
import {
  StaffProjectCreateBasicsSection,
  StaffProjectCreateDeadlinesSection,
} from "./StaffProjectCreatePanel.sections";

type StaffProjectCreatePanelProps = {
  modules: Module[];
  modulesError: string | null;
  initialModuleId?: string | null;
};

const CREATABLE_ROLES = new Set<Module["accountRole"]>(["OWNER", "ADMIN_ACCESS"]);

export function StaffProjectCreatePanel({
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
  const [templateId, setTemplateId] = useState("");
  const [deadline, setDeadline] = useState<DeadlineState>(() => buildDefaultDeadlineState());
  const [deadlinePresetStatus, setDeadlinePresetStatus] = useState<string | null>(null);
  const [deadlinePresetError, setDeadlinePresetError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const creatableModules = useMemo(
    () => modules.filter((module) => CREATABLE_ROLES.has(module.accountRole)),
    [modules]
  );

  useEffect(() => {
    if (!initialModuleId) return;
    if (moduleId.trim().length > 0) return;
    if (!creatableModules.some((module) => module.id === initialModuleId)) return;
    setModuleId(initialModuleId);
  }, [creatableModules, initialModuleId, moduleId]);

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
    deadline.taskDueDateMcf.trim().length > 0 &&
    deadline.assessmentOpenDate.trim().length > 0 &&
    deadline.assessmentDueDate.trim().length > 0 &&
    deadline.assessmentDueDateMcf.trim().length > 0 &&
    deadline.feedbackOpenDate.trim().length > 0 &&
    deadline.feedbackDueDate.trim().length > 0 &&
    deadline.feedbackDueDateMcf.trim().length > 0;

  const deadlinePreview = useMemo(() => buildDeadlinePreview(deadline), [deadline]);

  function applyMcfOffsetDays(offsetDays: number) {
    const result = applyMcfOffsetDaysToDeadlineState(deadline, offsetDays);
    if (!result.ok) {
      setDeadlinePresetStatus(null);
      setDeadlinePresetError(result.error);
      return;
    }

    setDeadline(result.value);
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

    const parsedDeadline = parseAndValidateDeadlineState(deadline);
    if (!parsedDeadline.ok) {
      setSubmitError(parsedDeadline.error);
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
          taskOpenDate: parsedDeadline.value.taskOpenDate.toISOString(),
          taskDueDate: parsedDeadline.value.taskDueDate.toISOString(),
          taskDueDateMcf: parsedDeadline.value.taskDueDateMcf.toISOString(),
          assessmentOpenDate: parsedDeadline.value.assessmentOpenDate.toISOString(),
          assessmentDueDate: parsedDeadline.value.assessmentDueDate.toISOString(),
          assessmentDueDateMcf: parsedDeadline.value.assessmentDueDateMcf.toISOString(),
          feedbackOpenDate: parsedDeadline.value.feedbackOpenDate.toISOString(),
          feedbackDueDate: parsedDeadline.value.feedbackDueDate.toISOString(),
          feedbackDueDateMcf: parsedDeadline.value.feedbackDueDateMcf.toISOString(),
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
            Create projects inside modules you lead. Enterprise admins can also create projects as an override.
            Questionnaire templates define the assessment form used by students.
          </p>
        </div>
        <span className="staff-projects__badge">
          {creatableModules.length} creatable module{creatableModules.length === 1 ? "" : "s"}
        </span>
      </div>

      <form className="staff-projects__create-form" onSubmit={onSubmit}>
        <StaffProjectCreateBasicsSection
          projectName={projectName}
          setProjectName={setProjectName}
          moduleId={moduleId}
          setModuleId={setModuleId}
          templateId={templateId}
          setTemplateId={setTemplateId}
          hasCreatableModule={hasCreatableModule}
          creatableModules={creatableModules}
          templates={templates}
          isLoadingTemplates={isLoadingTemplates}
          hasTemplates={hasTemplates}
        />

        <StaffProjectCreateDeadlinesSection
          deadline={deadline}
          setDeadline={setDeadline}
          applySchedulePreset={applySchedulePreset}
          resetSchedulePreset={resetSchedulePreset}
          applyMcfOffsetDays={applyMcfOffsetDays}
          deadlinePresetStatus={deadlinePresetStatus}
          deadlinePresetError={deadlinePresetError}
          deadlinePreview={deadlinePreview}
          formatDateTime={formatDateTime}
        />

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
