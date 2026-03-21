"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/features/auth/context";
import {
  approveStudentForumReport,
  getStudentForumReports,
  getStaffForumConversation,
  ignoreStudentForumReport,
} from "@/features/forum/api/client";
import type { ForumConversationPost, ForumPostConversation, StudentForumReportEntry } from "@/features/forum/types";

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

  const loadReports = async () => {
    if (!user) return;
    setStatus("loading");
    setMessage(null);
    try {
      const data = await getStudentForumReports(user.id, projectId);
      setReports(data);
      setStatus("success");
    } catch (err) {
      setReports([]);
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not load student reports.");
    }
  };

  useEffect(() => {
    void loadReports();
  }, [user, projectId]);

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
    setConversationStatus("loading");
    setConversationMessage(null);
    setActivePostId(postId);
    try {
      const data = await getStaffForumConversation(user.id, projectId, postId);
      setConversation(data);
      setConversationStatus("success");
    } catch (err) {
      setConversation(null);
      setConversationStatus("error");
      setConversationMessage(err instanceof Error ? err.message : "Could not load conversation.");
    }
  };

  const handleHideConversation = () => {
    setConversation(null);
    setConversationMessage(null);
    setConversationStatus("idle");
    setActivePostId(null);
  };

  const renderConversationPost = (post: ForumConversationPost, focusId: number, depth = 0) => (
    <div
      key={post.id}
      className="card"
      style={{
        padding: 12,
        marginLeft: depth * 16,
        border: post.id === focusId ? "1px solid var(--primary)" : "1px solid var(--border)",
        background: post.id === focusId ? "rgba(64, 126, 255, 0.08)" : "transparent",
      }}
    >
      <div className="ui-stack-xs">
        <strong>{post.title}</strong>
        <span className="muted">
          {post.author.firstName} {post.author.lastName} - {new Date(post.createdAt).toLocaleString()}
        </span>
      </div>
      <p style={{ margin: "8px 0 0" }}>{post.body}</p>
      {post.replies.length ? (
        <div className="ui-stack-sm" style={{ marginTop: 10 }}>
          {post.replies.map((reply) => renderConversationPost(reply, focusId, depth + 1))}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="card stack" style={{ padding: 20 }}>
      <div>
        <h3 style={{ marginBottom: 6 }}>Student reports</h3>
        <p className="muted" style={{ margin: 0 }}>
          Review reports submitted by students for this project.
        </p>
      </div>
      {message ? <p className="muted">{message}</p> : null}
      {status === "loading" ? <p className="muted">Loading reports...</p> : null}
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
            <p className="muted" style={{ marginTop: 12 }}>
              Loading conversation...
            </p>
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
              {conversation.thread ? renderConversationPost(conversation.thread, conversation.focusPostId) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
