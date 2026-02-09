import type { Question , PeerAssessment} from "../types";

export function mapApiQuestionsToQuestions(raw: any): Question[] {
    let arr: any[] = [];

    if (Array.isArray(raw)) {
        arr = raw;
    } else if (Array.isArray(raw.questions)) {
        arr = raw.questions;
    } else if (Array.isArray(raw.questionnaireTemplate?.questions)) {
        arr = raw.questionnaireTemplate.questions;
    }
    return arr.map((q: any, idx: number) => {
    const id = q.id;
    const text = String(q.label);
    const type =q.type;
    const configs = q.configs ?? undefined;
    const mappedConfigs = configs
      ? {
          options: Array.isArray(configs.options) ? configs.options.map(String) : undefined,
          min: typeof configs.min === "number" ? configs.min : undefined,
          max: typeof configs.max === "number" ? configs.max : undefined,
        }
      : undefined;

    return {
      id,
      text,
      type,
      order: typeof q.order === "number" ? q.order : idx,
      configs: mappedConfigs,
    } as Question;
  });
}

export function mapApiAssessmentToPeerAssessment(raw: any) : PeerAssessment {
    return {   
    id: String(raw.id),
    moduleId: raw.moduleId,
    projectId: raw.projectId,
    teamId: raw.teamId,
    reviewerUserId: raw.reviewerUserId,
    revieweeUserId: raw.revieweeUserId,
    submittedAt: raw.submittedAt,
    templateId: raw.templateId,
    answers: raw.answersJson ?? {},
    firstName: raw.reviewee?.firstName ?? "",
    lastName: raw.reviewee?.lastName ?? "",
  }
}