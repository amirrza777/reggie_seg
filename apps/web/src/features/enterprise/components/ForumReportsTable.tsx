"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Table } from "@/shared/ui/Table";
import type { ForumReportEntry } from "../types";
import { dismissForumReport, getForumReports } from "../api/client";

type RequestState = "idle" | "loading" | "success" | "error";

const toName = (user: ForumReportEntry["reporter"]) => `${user.firstName} ${user.lastName}`;

const truncate = (value: string, max = 140) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

export function ForumReportsTable() {
  const [reports, setReports] = useState<ForumReportEntry[]>([]);
  const [status, setStatus] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);

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
    setStatus("loading");
    setMessage(null);
    try {
      await dismissForumReport(reportId);
      setReports((prev) => prev.filter((report) => report.id !== reportId));
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not dismiss report.");
    }
  };

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
    <Button key={`${report.id}-dismiss`} type="button" size="sm" variant="ghost" onClick={() => handleDismiss(report.id)}>
      Restore
    </Button>,
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
    </Card>
  );
}
