import { apiFetch } from "@/shared/api/http";
import type { ForumReportConversation, ForumReportEntry } from "../types";

export async function getForumReports(): Promise<ForumReportEntry[]> {
  return apiFetch<ForumReportEntry[]>("/enterprise-admin/forum-reports");
}

export async function dismissForumReport(reportId: number): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/enterprise-admin/forum-reports/${reportId}`, { method: "DELETE" });
}

export async function getForumReportConversation(reportId: number): Promise<ForumReportConversation> {
  return apiFetch<ForumReportConversation>(`/enterprise-admin/forum-reports/${reportId}/conversation`);
}

export async function removeForumReportPost(reportId: number): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/enterprise-admin/forum-reports/${reportId}/remove`, {
    method: "DELETE",
  });
}
