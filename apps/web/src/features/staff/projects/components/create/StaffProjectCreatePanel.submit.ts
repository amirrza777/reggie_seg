import { createStaffProject } from "@/features/projects/api/client";
import { parseLocalDateTime, parseAndValidateDeadlineState } from "./StaffProjectCreatePanel.deadlines";
import type { CreateProjectDeadlineState } from "./StaffProjectCreatePanel.create-deadlines";

type SubmitParams = {
  projectName: string;
  informationText: string;
  moduleId: string;
  templateId: string;
  allocationTemplateId: string;
  deadline: CreateProjectDeadlineState;
  selectedStudentIds: number[];
};

type SubmitResult =
  | { ok: true; createdProjectId: number; createdModuleId: number; createdName: string; hasAllocationTemplate: boolean }
  | { ok: false; error: string };

export async function submitCreateProject(params: SubmitParams): Promise<SubmitResult> {
  const { projectName, informationText, moduleId, templateId, allocationTemplateId, deadline, selectedStudentIds } = params;

  const parsedModuleId = Number(moduleId);
  const parsedTemplateId = Number(templateId);
  if (!Number.isInteger(parsedModuleId) || !Number.isInteger(parsedTemplateId)) {
    return { ok: false, error: "Please choose a valid module and questionnaire template." };
  }

  let parsedAllocationTemplateId: number | null = null;
  if (allocationTemplateId.trim().length > 0) {
    const parsed = Number(allocationTemplateId);
    if (!Number.isInteger(parsed)) {
      return { ok: false, error: "Team allocation questionnaire must be a valid template." };
    }
    parsedAllocationTemplateId = parsed;
  }

  const deadlineResult = parseAndValidateDeadlineState(deadline);
  if (!deadlineResult.ok) return { ok: false, error: deadlineResult.error };
  const parsedDeadline = deadlineResult.value;

  const allocationOpenDate = parseLocalDateTime(deadline.teamAllocationQuestionnaireOpenDate);
  const allocationDueDate = parseLocalDateTime(deadline.teamAllocationQuestionnaireDueDate);

  if (parsedAllocationTemplateId !== null) {
    if (!allocationOpenDate || !allocationDueDate) {
      return { ok: false, error: "Set both open and due dates for the team allocation questionnaire." };
    }
    if (allocationOpenDate >= allocationDueDate) {
      return { ok: false, error: "Team allocation questionnaire open date must be before the due date." };
    }
    if (allocationDueDate >= parsedDeadline.taskOpenDate) {
      return { ok: false, error: "Team allocation questionnaire due date must be before project start (task open date)." };
    }
  }

  try {
    const created = await createStaffProject({
      name: projectName.trim(),
      moduleId: parsedModuleId,
      questionnaireTemplateId: parsedTemplateId,
      teamAllocationQuestionnaireTemplateId: parsedAllocationTemplateId ?? undefined,
      informationText: informationText.trim().length > 0 ? informationText.trim() : null,
      studentIds: selectedStudentIds.length > 0 ? selectedStudentIds : undefined,
      deadline: {
        taskOpenDate: parsedDeadline.taskOpenDate.toISOString(),
        taskDueDate: parsedDeadline.taskDueDate.toISOString(),
        taskDueDateMcf: parsedDeadline.taskDueDateMcf.toISOString(),
        assessmentOpenDate: parsedDeadline.assessmentOpenDate.toISOString(),
        assessmentDueDate: parsedDeadline.assessmentDueDate.toISOString(),
        assessmentDueDateMcf: parsedDeadline.assessmentDueDateMcf.toISOString(),
        feedbackOpenDate: parsedDeadline.feedbackOpenDate.toISOString(),
        feedbackDueDate: parsedDeadline.feedbackDueDate.toISOString(),
        feedbackDueDateMcf: parsedDeadline.feedbackDueDateMcf.toISOString(),
        teamAllocationQuestionnaireOpenDate:
          parsedAllocationTemplateId !== null && allocationOpenDate
            ? allocationOpenDate.toISOString()
            : null,
        teamAllocationQuestionnaireDueDate:
          parsedAllocationTemplateId !== null && allocationDueDate
            ? allocationDueDate.toISOString()
            : null,
      },
    });
    return {
      ok: true,
      createdProjectId: created.id,
      createdModuleId: created.moduleId,
      createdName: created.name,
      hasAllocationTemplate: parsedAllocationTemplateId !== null,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create project." };
  }
}