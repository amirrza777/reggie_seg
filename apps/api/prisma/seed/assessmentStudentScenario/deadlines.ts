import type { AssessmentStudentProjectState } from "./constants";
import { ASSESSMENT_STUDENT_DAY_MS } from "./constants";

export function buildAssessmentStudentDeadline(state: AssessmentStudentProjectState) {
  const now = Date.now();
  const offsets = getStateOffsets(state);
  const taskOpenDate = fromNow(now, offsets.taskOpen);
  const taskDueDate = fromNow(now, offsets.taskDue);
  const assessmentOpenDate = fromNow(now, offsets.assessmentOpen);
  const assessmentDueDate = fromNow(now, offsets.assessmentDue);
  const feedbackOpenDate = fromNow(now, offsets.feedbackOpen);
  const feedbackDueDate = fromNow(now, offsets.feedbackDue);

  return {
    taskOpenDate,
    taskDueDate,
    taskDueDateMcf: taskDueDate,
    assessmentOpenDate,
    assessmentDueDate,
    assessmentDueDateMcf: assessmentDueDate,
    feedbackOpenDate,
    feedbackDueDate,
    feedbackDueDateMcf: feedbackDueDate,
  };
}

function fromNow(now: number, days: number) {
  return new Date(now + days * ASSESSMENT_STUDENT_DAY_MS);
}

function getStateOffsets(state: AssessmentStudentProjectState) {
  if (state === "upcoming") {
    return { taskOpen: 4, taskDue: 14, assessmentOpen: 15, assessmentDue: 20, feedbackOpen: 21, feedbackDue: 25 };
  }
  if (state === "assessment-open") {
    return { taskOpen: -14, taskDue: -2, assessmentOpen: -1, assessmentDue: 5, feedbackOpen: 6, feedbackDue: 10 };
  }
  if (state === "feedback-pending") {
    return { taskOpen: -24, taskDue: -15, assessmentOpen: -14, assessmentDue: -3, feedbackOpen: -2, feedbackDue: 6 };
  }
  return { taskOpen: -45, taskDue: -34, assessmentOpen: -33, assessmentDue: -22, feedbackOpen: -21, feedbackDue: -10 };
}
