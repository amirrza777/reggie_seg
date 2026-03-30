"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createStaffProject } from "@/features/projects/api/client";
import { listModules } from "@/features/modules/api/client";
import { getMyQuestionnaires } from "@/features/questionnaires/api/client";
import type { Questionnaire } from "@/features/questionnaires/types";
import type { Module } from "@/features/modules/types";
import { SEARCH_DEBOUNCE_MS } from "@/shared/lib/search";
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
  StaffProjectCreateActionsSection,
  StaffProjectCreateBasicsSection,
  StaffProjectCreateDeadlinesSection,
  StaffProjectCreateInformationSection,
} from "./StaffProjectCreatePanel.sections";

type StaffProjectCreatePanelProps = {
  currentUserId: number;
  modules: Module[];
  modulesError: string | null;
  initialModuleId?: string | null;
};

const CREATABLE_ROLES = new Set<Module["accountRole"]>(["OWNER", "ADMIN_ACCESS"]);

function findVisibleOption<T extends { id: string | number }>(selectedId: string, primary: T[], secondary: T[]) {
  const selected = primary.find((item) => String(item.id) === selectedId) ?? secondary.find((item) => String(item.id) === selectedId);
  if (!selected || secondary.some((item) => item.id === selected.id)) {
    return secondary;
  }
  return [selected, ...secondary];
}

export function StaffProjectCreatePanel({
  currentUserId,
  modules,
  modulesError,
  initialModuleId = null,
}: StaffProjectCreatePanelProps) {
  const router = useRouter();
  const creatableModulesFromProps = useMemo(
    () => modules.filter((module) => CREATABLE_ROLES.has(module.accountRole)),
    [modules],
  );

  const [templates, setTemplates] = useState<Questionnaire[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [informationText, setInformationText] = useState("");
  const [moduleId, setModuleId] = useState(initialModuleId ?? "");
  const [moduleSearchQuery, setModuleSearchQuery] = useState("");
  const [moduleSearchError, setModuleSearchError] = useState<string | null>(null);
  const [moduleOptions, setModuleOptions] = useState<Module[]>(creatableModulesFromProps);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [selectedTemplateOption, setSelectedTemplateOption] = useState<Questionnaire | null>(null);
  const [deadline, setDeadline] = useState<DeadlineState>(() => buildDefaultDeadlineState());
  const [deadlinePresetStatus, setDeadlinePresetStatus] = useState<string | null>(null);
  const [deadlinePresetError, setDeadlinePresetError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!moduleSearchQuery.trim()) {
      setModuleOptions(creatableModulesFromProps);
    }
  }, [creatableModulesFromProps, moduleSearchQuery]);

  useEffect(() => {
    if (!initialModuleId || moduleId.trim() || !creatableModulesFromProps.some((module) => module.id === initialModuleId)) {
      return;
    }
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
          if (isMounted) {
            setModuleOptions(result.filter((module) => CREATABLE_ROLES.has(module.accountRole)));
          }
        })
        .catch((error) => {
          if (isMounted) {
            setModuleSearchError(error instanceof Error ? error.message : "Failed to search modules.");
            setModuleOptions([]);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingModules(false);
          }
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
          if (!templateId.trim()) return;
          const selected = sorted.find((template) => String(template.id) === templateId) ?? null;
          if (selected) {
            setSelectedTemplateOption(selected);
          }
        })
        .catch((error) => {
          if (isMounted) {
            setTemplatesError(error instanceof Error ? error.message : "Failed to load your questionnaires.");
            setTemplates([]);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingTemplates(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [templateId, templateSearchQuery]);

  const hasCreatableModule = creatableModulesFromProps.length > 0;
  const hasTemplates = templates.length > 0 || templateId.trim().length > 0;
  const visibleModules = useMemo(
    () => findVisibleOption(moduleId, creatableModulesFromProps, moduleOptions),
    [creatableModulesFromProps, moduleId, moduleOptions],
  );
  const visibleTemplates = useMemo(
    () => findVisibleOption(templateId, selectedTemplateOption ? [selectedTemplateOption] : [], templates),
    [selectedTemplateOption, templateId, templates],
  );
  const deadlinePreview = useMemo(() => buildDeadlinePreview(deadline), [deadline]);

  const canSubmit =
    !isSubmitting &&
    hasCreatableModule &&
    hasTemplates &&
    projectName.trim().length > 0 &&
    moduleId.trim().length > 0 &&
    templateId.trim().length > 0 &&
    Object.values(deadline).every((value) => value.trim().length > 0);

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

    const validatedDeadline = parseAndValidateDeadlineState(deadline);
    if (!validatedDeadline.ok) {
      setSubmitError(validatedDeadline.error);
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
        informationText: informationText.trim() ? informationText.trim() : null,
        deadline: {
          taskOpenDate: validatedDeadline.value.taskOpenDate.toISOString(),
          taskDueDate: validatedDeadline.value.taskDueDate.toISOString(),
          taskDueDateMcf: validatedDeadline.value.taskDueDateMcf.toISOString(),
          assessmentOpenDate: validatedDeadline.value.assessmentOpenDate.toISOString(),
          assessmentDueDate: validatedDeadline.value.assessmentDueDate.toISOString(),
          assessmentDueDateMcf: validatedDeadline.value.assessmentDueDateMcf.toISOString(),
          feedbackOpenDate: validatedDeadline.value.feedbackOpenDate.toISOString(),
          feedbackDueDate: validatedDeadline.value.feedbackDueDate.toISOString(),
          feedbackDueDateMcf: validatedDeadline.value.feedbackDueDateMcf.toISOString(),
        },
      });

      setProjectName("");
      setInformationText("");
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
        <StaffProjectCreateBasicsSection
          projectName={projectName}
          onProjectNameChange={setProjectName}
          moduleId={moduleId}
          onModuleIdChange={setModuleId}
          moduleSearchQuery={moduleSearchQuery}
          onModuleSearchQueryChange={setModuleSearchQuery}
          templateId={templateId}
          onTemplateIdChange={(nextTemplateId) => {
            setTemplateId(nextTemplateId);
            const nextTemplate = templates.find((template) => String(template.id) === nextTemplateId) ?? null;
            if (nextTemplate) {
              setSelectedTemplateOption(nextTemplate);
            }
          }}
          templateSearchQuery={templateSearchQuery}
          onTemplateSearchQueryChange={setTemplateSearchQuery}
          hasCreatableModule={hasCreatableModule}
          visibleModules={visibleModules}
          hasTemplates={hasTemplates}
          visibleTemplates={visibleTemplates}
          isLoadingModules={isLoadingModules}
          isLoadingTemplates={isLoadingTemplates}
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

        <StaffProjectCreateInformationSection
          informationText={informationText}
          onInformationTextChange={setInformationText}
        />

        <StaffProjectCreateActionsSection canSubmit={canSubmit} isSubmitting={isSubmitting} />
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
        <p className="staff-projects__hint">You do not have any questionnaire templates yet. Create one first.</p>
      ) : null}
      {submitError ? <p className="staff-projects__error">{submitError}</p> : null}
      {submitSuccess ? <p className="staff-projects__success">{submitSuccess}</p> : null}
    </section>
  );
}
