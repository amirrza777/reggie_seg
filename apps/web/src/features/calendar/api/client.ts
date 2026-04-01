import { apiFetch } from "@/shared/api/http";

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type:
    | "task_open"
    | "task_due"
    | "assessment_open"
    | "assessment_due"
    | "feedback_open"
    | "feedback_due"
    | "team_allocation_questionnaire_open"
    | "team_allocation_questionnaire_due"
    | "meeting";
  projectName?: string;
};

export async function getCalendarEvents(userId: number): Promise<CalendarEvent[]> {
  return apiFetch<CalendarEvent[]>(`/calendar/events?userId=${userId}`);
}
