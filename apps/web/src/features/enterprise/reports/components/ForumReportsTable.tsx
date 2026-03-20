"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";
import type { ForumReportConversation, ForumReportEntry, ForumConversationPost } from "../types";
import {
  dismissForumReport,
  getForumReports,
  getForumReportConversation,
  removeForumReportPost,
} from "../api/client";

type RequestState = "idle" | "loading" | "success" | "error";

const toName = (user: ForumReportEntry["reporter"]) => `${user.firstName} ${user.lastName}`;

const truncate = (value: string, max = 140) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

export function ForumReportsTable() {
  const [reports, setReports] = useState<ForumReportEntry[]>([]);
  const [status, setStatus] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] = useState<RequestState>("idle");
  const [conversationMessage, setConversationMessage] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ForumReportConversation | null>(null);
  const [activeReportId, setActiveReportId] = useState<number | null>(null);

  const loadReports = async () => {
    setStatus("loading");
    setMessage(null);
    try {
      const data = await getForumReports();
      setReports(data);
      setStatus("success");
    } catch (err) {
      setReports([]);
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not load forum reports.");
    }
  };

  useEffect(() => {
    void loadReports();
  }, []);

  const handleDismiss = async (reportId: number) => {
    if (!window.confirm("Dismiss this report and restore the post?")) return;
    setStatus("loading");
    setMessage(null);
    try {
      await dismissForumReport(reportId);
      setReports((prev) => prev.filter((report) => report.id !== reportId));
      if (activeReportId === reportId) handleHideConversation();
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not dismiss report.");
    }
  };

  const handleRemove = async (reportId: number) => {
    if (!window.confirm("Permanently remove this post from the database? This cannot be undone.")) {
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      await removeForumReportPost(reportId);
      setReports((prev) => prev.filter((report) => report.id !== reportId));
      if (activeReportId === reportId) handleHideConversation();
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not remove post.");
    }
  };

  const handleViewConversation = async (reportId: number) => {
    setConversationStatus("loading");
    setConversationMessage(null);
    setActiveReportId(reportId);
    try {
      const data = await getForumReportConversation(reportId);
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
    setActiveReportId(null);
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

  const rows = reports.map((report) => [
    <div key={`${report.id}-project`} className="ui-stack-xs">
      <strong>{report.project.name}</strong>
      <span className="muted">{report.project.module.name}</span>
    </div>,
    <div key={`${report.id}-author`} className="ui-stack-xs">
      <strong>{toName(report.author)}</strong>
      <span className="muted">{report.author.email}</span>
    </div>,
    <div key={`${report.id}-reporter`} className="ui-stack-xs">
      <strong>{toName(report.reporter)}</strong>
      <span className="muted">{report.reporter.email}</span>
    </div>,
    <div key={`${report.id}-content`} className="ui-stack-xs">
      <strong>{report.title}</strong>
      <span className="muted">{truncate(report.body)}</span>
      {report.reason ? <span className="muted">Reason: {report.reason}</span> : null}
    </div>,
    <span key={`${report.id}-date`} className="muted">
      {new Date(report.createdAt).toLocaleString()}
    </span>,
    <div key={`${report.id}-actions`} className="ui-stack-xs">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => (activeReportId === report.id && conversation ? handleHideConversation() : handleViewConversation(report.id))}
      >
        {activeReportId === report.id && conversation ? "Hide conversation" : "View conversation"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => handleDismiss(report.id)}>
        Dismiss report
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => handleRemove(report.id)}>
        Remove
      </Button>
    </div>,
  ]);

  return (
    <Card title="Forum reports" action={null}>
      {message ? (
        <div className={`${status === "error" ? "status-alert status-alert--error" : "status-alert status-alert--success"} status-alert--spaced`}>
          <span>{message}</span>
        </div>
      ) : null}
      {rows.length > 0 ? (
        <Table
          headers={["Project", "Author", "Reporter", "Content", "Reported", ""]}
          rows={rows}
          rowClassName="user-management__row"
        />
      ) : (
        <div className="ui-empty-state">
          <p>{status === "loading" ? "Loading reports..." : "No forum reports yet."}</p>
        </div>
      )}
      {activeReportId && conversationStatus === "loading" ? (
        <div className="ui-empty-state">
          <p>Loading conversation...</p>
        </div>
      ) : null}
      {conversationMessage ? (
        <div className="ui-empty-state">
          <p>{conversationMessage}</p>
        </div>
      ) : null}
      {conversation ? (
        <div className="ui-stack-sm" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <h3>Conversation</h3>
            <Button type="button" size="sm" variant="ghost" onClick={handleHideConversation}>
              Hide conversation
            </Button>
          </div>
          {conversation.missingPost ? (
            <p className="muted">The original post is no longer in the forum, so only the reported content is available.</p>
          ) : null}
          {renderConversationPost(conversation.thread, conversation.focusPostId)}
        </div>
      ) : null}
    </Card>
  );
}
