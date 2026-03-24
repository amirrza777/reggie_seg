"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/features/auth/useUser";
import { ForumConversationTree } from "@/shared/ui/ForumConversationTree";
import { SkeletonText } from "@/shared/ui/Skeleton";
import {
  approveStudentForumReport,
  getStudentForumReports,
  getStaffForumConversation,
  ignoreStudentForumReport,
} from "@/features/forum/api/client";
import type { ForumPostConversation, StudentForumReportEntry } from "@/features/forum/types";

type StudentForumReportsCardProps = {
  projectId: number;
};

type RequestState = "idle" | "loading" | "success" | "error";

export function StudentForumReportsCard({ projectId }: StudentForumReportsCardProps) {
  const { user } = useUser();
  const [reports, setReports] = useState<StudentForumReportEntry[]>([]);
  const [status, setStatus] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] = useState<RequestState>("idle");
  const [conversationMessage, setConversationMessage] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ForumPostConversation | null>(null);
  const [activePostId, setActivePostId] = useState<number | null>(null);
  const loadRequestIdRef = useRef(0);
  const conversationRequestIdRef = useRef(0);

  const loadReports = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    if (!user) {
      setReports([]);
      setStatus("idle");
      setMessage(null);
      setConversation(null);
      setConversationMessage(null);
      setConversationStatus("idle");
      setActivePostId(null);
      conversationRequestIdRef.current += 1;
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const data = await getStudentForumReports(user.id, projectId);
      if (requestId !== loadRequestIdRef.current) return;
      setReports(data);
      setStatus("success");
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      setReports([]);
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not load student reports.");
    }
  }, [user, projectId]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadReports();
    });
  }, [loadReports]);

  const handleApprove = async (reportId: number) => {
    if (!user) return;
    const reportPostId = reports.find((report) => report.id === reportId)?.post.id ?? null;
    if (!window.confirm("Approve this report and hide the post from the forum?")) return;
    setStatus("loading");
    setMessage(null);
    try {
      await approveStudentForumReport(user.id, projectId, reportId);
      setReports((prev) => prev.filter((report) => report.id !== reportId));
      if (reportPostId && activePostId === reportPostId) {
        handleHideConversation();
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not approve report.");
    }
  };

  const handleIgnore = async (reportId: number) => {
    if (!user) return;
    const reportPostId = reports.find((report) => report.id === reportId)?.post.id ?? null;
    if (!window.confirm("Ignore this report?")) return;
    setStatus("loading");
    setMessage(null);
    try {
      await ignoreStudentForumReport(user.id, projectId, reportId);
      setReports((prev) => prev.filter((report) => report.id !== reportId));
      if (reportPostId && activePostId === reportPostId) {
        handleHideConversation();
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not ignore report.");
    }
  };

  const handleViewConversation = async (postId: number) => {
    if (!user) return;
    const requestId = ++conversationRequestIdRef.current;
    setConversationStatus("loading");
    setConversationMessage(null);
    setActivePostId(postId);
    try {
      const data = await getStaffForumConversation(user.id, projectId, postId);
      if (requestId !== conversationRequestIdRef.current) return;
      setConversation(data);
      setConversationStatus("success");
    } catch (err) {
      if (requestId !== conversationRequestIdRef.current) return;
      setConversation(null);
      setConversationStatus("error");
      setConversationMessage(err instanceof Error ? err.message : "Could not load conversation.");
    }
  };

  const handleHideConversation = () => {
    conversationRequestIdRef.current += 1;
    setConversation(null);
    setConversationMessage(null);
    setConversationStatus("idle");
    setActivePostId(null);
  };

  return (
    <div className="card stack" style={{ padding: 20 }}>
      <div>
        <h3 style={{ marginBottom: 6 }}>Student reports</h3>
        <p className="muted" style={{ margin: 0 }}>
          Review reports submitted by students for this project.
        </p>
      </div>
      {message ? <p className="muted">{message}</p> : null}
      {status === "loading" ? (
        <div className="ui-stack-sm" role="status" aria-live="polite">
          <SkeletonText lines={2} widths={["48%", "86%"]} />
          <SkeletonText lines={2} widths={["42%", "74%"]} />
          <span className="ui-visually-hidden">Loading reports...</span>
        </div>
      ) : null}
      {reports.length === 0 && status !== "loading" ? <p className="muted">No pending reports.</p> : null}
      {reports.map((report) => (
        <div key={report.id} className="card" style={{ padding: 16, marginTop: 12 }}>
          <div className="stack" style={{ gap: 6 }}>
            <strong>{report.post.title || "Reply"}</strong>
            <p className="muted" style={{ margin: 0 }}>
              Reported by {report.reporter.firstName} {report.reporter.lastName} -{" "}
              {new Date(report.createdAt).toLocaleString()}
            </p>
            <p className="muted" style={{ margin: 0 }}>
              Reported by {report.reportCount} student{report.reportCount === 1 ? "" : "s"}
            </p>
            <p className="muted" style={{ margin: 0 }}>
              Author: {report.post.author.firstName} {report.post.author.lastName}
            </p>
            <p style={{ margin: 0 }}>{report.post.body}</p>
            {report.reason ? <p className="muted">Reason: {report.reason}</p> : null}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 12 }}>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() =>
                activePostId === report.post.id && conversation
                  ? handleHideConversation()
                  : handleViewConversation(report.post.id)
              }
            >
              {activePostId === report.post.id && conversation ? "Hide conversation" : "View conversation"}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => handleIgnore(report.id)}>
              Ignore
            </button>
            <button type="button" className="btn btn--primary" onClick={() => handleApprove(report.id)}>
              Approve
            </button>
          </div>
          {activePostId === report.post.id && conversationStatus === "loading" ? (
            <div style={{ marginTop: 12 }} role="status" aria-live="polite">
              <SkeletonText lines={2} widths={["38%", "82%"]} />
              <span className="ui-visually-hidden">Loading conversation...</span>
            </div>
          ) : null}
          {activePostId === report.post.id && conversationMessage ? (
            <p className="muted" style={{ marginTop: 12 }}>
              {conversationMessage}
            </p>
          ) : null}
          {activePostId === report.post.id && conversation ? (
            <div className="ui-stack-sm" style={{ marginTop: 12 }}>
              {conversation.missingPost ? (
                <p className="muted">
                  The original post is no longer in the forum, so only the reported content is available.
                </p>
              ) : null}
              {conversation.thread ? (
                <ForumConversationTree post={conversation.thread} focusPostId={conversation.focusPostId} />
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
