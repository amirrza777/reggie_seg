import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getModuleStudents } from "@/features/modules/api/client";
import { getMyQuestionnaires } from "@/features/questionnaires/api/client";
import type { Questionnaire } from "@/features/questionnaires/types";
import type { Module, ModuleStudent } from "@/features/modules/types";
import { SEARCH_DEBOUNCE_MS } from "@/shared/lib/search";
import { loadProjectPeerTemplates } from "./StaffProjectCreatePanel.templates";
import {
  buildDeadlinePreview,
  applyMcfOffsetDaysToDeadlineState,
} from "./StaffProjectCreatePanel.deadlines";
import {
  buildDefaultCreateProjectDeadlineState,
  buildPresetCreateProjectDeadlineState,
  toStudentName,
  type CreateProjectDeadlineState,
} from "./StaffProjectCreatePanel.create-deadlines";
import { submitCreateProject } from "./StaffProjectCreatePanel.submit";

export { toStudentName };
export type { CreateProjectDeadlineState };

type Props = {
  modules: Module[];
  modulesError: string | null;
  initialModuleId?: string | null;
};

const CREATABLE_ROLES = new Set<Module["accountRole"]>(["OWNER", "ADMIN_ACCESS"]);

export function useStaffProjectCreatePanel({ modules, initialModuleId = null }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Questionnaire[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [allocationTemplates, setAllocationTemplates] = useState<Questionnaire[]>([]);
  const [isLoadingAllocationTemplates, setIsLoadingAllocationTemplates] = useState(true);
  const [allocationTemplatesError, setAllocationTemplatesError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [informationText, setInformationText] = useState("");
  const [moduleId, setModuleId] = useState(initialModuleId == null ? "" : String(initialModuleId));
  const [templateId, setTemplateId] = useState("");
  const [allocationTemplateId, setAllocationTemplateId] = useState("");
  const [deadline, setDeadline] = useState<CreateProjectDeadlineState>(
    () => buildDefaultCreateProjectDeadlineState(),
  );
  const [deadlinePresetStatus, setDeadlinePresetStatus] = useState<string | null>(null);
  const [deadlinePresetError, setDeadlinePresetError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplateOption, setSelectedTemplateOption] = useState<Questionnaire | null>(null);
  const [selectedAllocationTemplateOption, setSelectedAllocationTemplateOption] = useState<Questionnaire | null>(null);
  const [moduleStudents, setModuleStudents] = useState<ModuleStudent[]>([]);
  const [isLoadingModuleStudents, setIsLoadingModuleStudents] = useState(false);
  const [moduleStudentsError, setModuleStudentsError] = useState<string | null>(null);
  const [studentSearchInput, setStudentSearchInput] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const latestModuleStudentsRequestRef = useRef(0);

  const creatableModulesFromProps = useMemo(
    () => modules.filter((module) => CREATABLE_ROLES.has(module.accountRole)),
    [modules],
  );

  useEffect(() => {
    const normalizedModuleId = typeof moduleId === "string" ? moduleId : String(moduleId ?? "");
    const preferredModuleId =
      initialModuleId != null &&
      creatableModulesFromProps.some((module) => String(module.id) === String(initialModuleId))
        ? String(initialModuleId)
        : String(creatableModulesFromProps[0]?.id ?? "");
    if (!preferredModuleId) return;
    const moduleIdIsValid = creatableModulesFromProps.some(
      (module) => String(module.id) === normalizedModuleId,
    );
    if (!moduleIdIsValid) setModuleId(preferredModuleId);
  }, [creatableModulesFromProps, initialModuleId, moduleId]);

  useEffect(() => {
    let isMounted = true;
    const timer = window.setTimeout(() => {
      void loadProjectPeerTemplates({
        templateId,
        getMyQuestionnaires,
        isMounted: () => isMounted,
        setIsLoadingTemplates,
        setTemplatesError,
        setTemplates,
        setSelectedTemplateOption,
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => { isMounted = false; window.clearTimeout(timer); };
  }, [templateId]);

  useEffect(() => {
    let isMounted = true;
    const timer = window.setTimeout(() => {
      setIsLoadingAllocationTemplates(true);
      setAllocationTemplatesError(null);
      getMyQuestionnaires({ query: undefined })
        .then((result) => {
          if (!isMounted) return;
          const sorted = [...result]
            .filter((t) => t.purpose === "CUSTOMISED_ALLOCATION" || t.purpose === "GENERAL_PURPOSE")
            .sort((a, b) => a.templateName.localeCompare(b.templateName));
          setAllocationTemplates(sorted);
          if (allocationTemplateId.trim().length > 0) {
            const selected = sorted.find((t) => String(t.id) === allocationTemplateId) ?? null;
            if (selected) setSelectedAllocationTemplateOption(selected);
          }
        })
        .catch((error) => {
          if (!isMounted) return;
          setAllocationTemplatesError(
            error instanceof Error ? error.message : "Failed to load allocation questionnaires.",
          );
          setAllocationTemplates([]);
        })
        .finally(() => { if (!isMounted) return; setIsLoadingAllocationTemplates(false); });
    }, SEARCH_DEBOUNCE_MS);
    return () => { isMounted = false; window.clearTimeout(timer); };
  }, [allocationTemplateId]);

  function loadModuleStudents(
    nextModuleId: number,
    options: { preserveSelection?: boolean; autoSelectAll?: boolean } = {},
  ) {
    const requestId = latestModuleStudentsRequestRef.current + 1;
    latestModuleStudentsRequestRef.current = requestId;
    setIsLoadingModuleStudents(true);
    setModuleStudentsError(null);
    getModuleStudents(nextModuleId)
      .then((result) => {
        if (latestModuleStudentsRequestRef.current !== requestId) return;
        const enrolledStudents = result.students.filter((s) => s.enrolled && s.active);
        setModuleStudents(result.students);
        if (options.preserveSelection) {
          const availableIds = new Set(enrolledStudents.map((s) => s.id));
          setSelectedStudentIds((current) => current.filter((id) => availableIds.has(id)));
          return;
        }
        setSelectedStudentIds(options.autoSelectAll ? enrolledStudents.map((s) => s.id) : []);
      })
      .catch((error) => {
        if (latestModuleStudentsRequestRef.current !== requestId) return;
        setModuleStudentsError(error instanceof Error ? error.message : "Failed to load module students.");
        setModuleStudents([]);
      })
      .finally(() => {
        if (latestModuleStudentsRequestRef.current !== requestId) return;
        setIsLoadingModuleStudents(false);
      });
  }

  useEffect(() => {
    const normalizedModuleId = typeof moduleId === "string" ? moduleId : String(moduleId ?? "");
    setModuleStudents([]);
    setStudentSearchInput("");
    setModuleStudentsError(null);
    if (!normalizedModuleId.trim()) { setSelectedStudentIds([]); return; }
    const parsed = Number(normalizedModuleId);
    if (!Number.isInteger(parsed)) { setSelectedStudentIds([]); return; }
    loadModuleStudents(parsed, { autoSelectAll: true });
  }, [moduleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasCreatableModule = creatableModulesFromProps.length > 0;
  const hasTemplates = templates.length > 0 || templateId.trim().length > 0;
  const hasAllocationTemplates = allocationTemplates.length > 0 || allocationTemplateId.trim().length > 0;
  const hasSelectedAllocationTemplate = allocationTemplateId.trim().length > 0;

  const selectedModule = useMemo(
    () => creatableModulesFromProps.find((module) => String(module.id) === moduleId) ?? null,
    [creatableModulesFromProps, moduleId],
  );
  const hasModuleSelection = selectedModule !== null;

  const visibleTemplates = useMemo(() => {
    const selected = templates.find((t) => String(t.id) === templateId) ?? selectedTemplateOption;
    if (!selected) return templates;
    if (templates.some((t) => t.id === selected.id)) return templates;
    return [selected, ...templates];
  }, [selectedTemplateOption, templateId, templates]);

  const visibleAllocationTemplates = useMemo(() => {
    const selected =
      allocationTemplates.find((t) => String(t.id) === allocationTemplateId) ?? selectedAllocationTemplateOption;
    if (!selected) return allocationTemplates;
    if (allocationTemplates.some((t) => t.id === selected.id)) return allocationTemplates;
    return [selected, ...allocationTemplates];
  }, [allocationTemplateId, allocationTemplates, selectedAllocationTemplateOption]);

  const enrolledModuleStudents = useMemo(
    () => moduleStudents.filter((s) => s.enrolled && s.active),
    [moduleStudents],
  );

  const filteredModuleStudents = useMemo(() => {
    const query = studentSearchInput.trim().toLowerCase();
    if (!query) return enrolledModuleStudents;
    return enrolledModuleStudents.filter((s) => {
      const fullName = `${s.firstName} ${s.lastName}`.trim().toLowerCase();
      return fullName.includes(query) || s.email.toLowerCase().includes(query) || String(s.id).includes(query);
    });
  }, [enrolledModuleStudents, studentSearchInput]);

  const canSubmit =
    !isSubmitting && hasCreatableModule && hasTemplates &&
    projectName.trim().length > 0 && moduleId.trim().length > 0 && templateId.trim().length > 0 &&
    deadline.taskOpenDate.trim().length > 0 && deadline.taskDueDate.trim().length > 0 &&
    deadline.taskDueDateMcf.trim().length > 0 && deadline.assessmentOpenDate.trim().length > 0 &&
    deadline.assessmentDueDate.trim().length > 0 && deadline.assessmentDueDateMcf.trim().length > 0 &&
    deadline.feedbackOpenDate.trim().length > 0 && deadline.feedbackDueDate.trim().length > 0 &&
    deadline.feedbackDueDateMcf.trim().length > 0 &&
    (!hasSelectedAllocationTemplate ||
      (deadline.teamAllocationQuestionnaireOpenDate.trim().length > 0 &&
        deadline.teamAllocationQuestionnaireDueDate.trim().length > 0));

  const deadlinePreview = useMemo(() => buildDeadlinePreview(deadline), [deadline]);

  function applyMcfOffsetDays(offsetDays: number) {
    const result = applyMcfOffsetDaysToDeadlineState(deadline, offsetDays);
    if (!result.ok) {
      setDeadlinePresetStatus(null);
      setDeadlinePresetError(result.error);
      return;
    }
    setDeadline((prev) => ({ ...prev, ...result.value }));
    setDeadlinePresetError(null);
    setDeadlinePresetStatus(`Applied MCF +${offsetDays} days to all due dates.`);
  }

  function applySchedulePreset(totalWeeks: number) {
    setDeadline(buildPresetCreateProjectDeadlineState(totalWeeks));
    setDeadlinePresetError(null);
    setDeadlinePresetStatus(`Applied ${totalWeeks}-week project schedule.`);
  }

  function resetSchedulePreset() {
    setDeadline(buildDefaultCreateProjectDeadlineState());
    setDeadlinePresetError(null);
    setDeadlinePresetStatus("Reset to default project schedule.");
  }

  function selectAllModuleStudents() { setSelectedStudentIds(enrolledModuleStudents.map((s) => s.id)); }
  function clearSelectedModuleStudents() { setSelectedStudentIds([]); }
  function toggleStudentSelection(studentId: number) {
    setSelectedStudentIds((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId],
    );
  }
  function handleStudentSearchChange(nextValue: string) { setStudentSearchInput(nextValue); }
  function refreshModuleStudents() {
    if (!hasModuleSelection) return;
    const parsed = Number(moduleId);
    if (!Number.isInteger(parsed)) return;
    loadModuleStudents(parsed, { preserveSelection: true });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    const result = await submitCreateProject({
      projectName, informationText, moduleId, templateId, allocationTemplateId, deadline, selectedStudentIds,
    });
    setIsSubmitting(false);
    if (!result.ok) { setSubmitError(result.error); return; }
    setProjectName("");
    setInformationText("");
    setAllocationTemplateId("");
    setSelectedAllocationTemplateOption(null);
    setDeadline(buildDefaultCreateProjectDeadlineState());
    setStudentSearchInput("");
    setSelectedStudentIds([]);
    setModuleStudents([]);
    setSubmitSuccess(`Project "${result.createdName}" created.`);
    if (result.hasAllocationTemplate) {
      router.push(`/staff/projects/${result.createdProjectId}/team-allocation`);
    } else {
      router.push(`/staff/modules/${result.createdModuleId}`);
    }
    router.refresh();
  }

  return {
    templates, isLoadingTemplates, templatesError,
    allocationTemplates, isLoadingAllocationTemplates, allocationTemplatesError,
    projectName, setProjectName,
    informationText, setInformationText,
    moduleId,
    templateId, setTemplateId, setSelectedTemplateOption,
    allocationTemplateId, setAllocationTemplateId, setSelectedAllocationTemplateOption,
    deadline, setDeadline,
    deadlinePresetStatus, deadlinePresetError,
    submitError, submitSuccess, isSubmitting,
    moduleStudents, isLoadingModuleStudents, moduleStudentsError,
    studentSearchInput,
    selectedStudentIds,
    creatableModulesFromProps,
    hasCreatableModule, hasTemplates, hasAllocationTemplates, hasSelectedAllocationTemplate,
    selectedModule, hasModuleSelection,
    visibleTemplates, visibleAllocationTemplates,
    enrolledModuleStudents, filteredModuleStudents,
    canSubmit, deadlinePreview,
    applyMcfOffsetDays, applySchedulePreset, resetSchedulePreset,
    selectAllModuleStudents, clearSelectedModuleStudents, toggleStudentSelection,
    handleStudentSearchChange, refreshModuleStudents,
    onSubmit,
  };
}