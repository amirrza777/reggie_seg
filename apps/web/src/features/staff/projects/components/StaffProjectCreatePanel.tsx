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

const CREATABLE_ROLES = new Set<Module["accountRole"]>(["OWNER", "ADMIN_ACCESS"]);

export function StaffProjectCreatePanel({ modules, modulesError }: StaffProjectCreatePanelProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Questionnaire[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [templateId, setTemplateId] = useState("");
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
    templateId.trim().length > 0;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const parsedModuleId = Number(moduleId);
    const parsedTemplateId = Number(templateId);
    if (!Number.isInteger(parsedModuleId) || !Number.isInteger(parsedTemplateId)) {
      setSubmitError("Please choose a valid module and questionnaire template.");
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
      });
      setProjectName("");
      setSubmitSuccess(`Project "${created.name}" created.`);
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
