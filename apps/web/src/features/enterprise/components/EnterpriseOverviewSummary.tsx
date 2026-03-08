"use client";

import { useEffect, useMemo, useState } from "react";
import { getEnterpriseOverview } from "../api/client";
import type { EnterpriseOverview } from "../types";
import { Card } from "@/shared/ui/Card";

type RequestState = "idle" | "loading" | "success" | "error";

export function EnterpriseOverviewSummary() {
  const [overview, setOverview] = useState<EnterpriseOverview | null>(null);
  const [status, setStatus] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadOverview = async () => {
      setStatus("loading");
      setMessage(null);
      try {
        const response = await getEnterpriseOverview();
        setOverview(response);
        setStatus("success");
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Could not load enterprise overview.");
      }
    };

    void loadOverview();
  }, []);

  const actionItems = useMemo(() => {
    if (!overview) return [];

    const items: Array<{ label: string; value: number }> = [
      { label: "Inactive accounts to review", value: overview.hygiene.inactiveUsers },
      { label: "Students not assigned to a module", value: overview.hygiene.studentsWithoutModule },
      { label: "Modules with no students", value: overview.hygiene.modulesWithoutStudents },
    ];

    return items.filter((item) => item.value > 0);
  }, [overview]);

  const quickHealthChecks = useMemo(() => {
    if (!overview) return [];

    const studentsAssigned = Math.max(overview.totals.students - overview.hygiene.studentsWithoutModule, 0);
    const modulesWithStudents = Math.max(overview.totals.modules - overview.hygiene.modulesWithoutStudents, 0);

    return [
      {
        label: "Active account rate",
        value: formatPercent(overview.totals.activeUsers, overview.totals.users),
        detail: `${overview.totals.activeUsers}/${overview.totals.users} active`,
      },
      {
        label: "Student module coverage",
        value: formatPercent(studentsAssigned, overview.totals.students),
        detail: `${studentsAssigned}/${overview.totals.students} assigned`,
      },
      {
        label: "Module utilization",
        value: formatPercent(modulesWithStudents, overview.totals.modules),
        detail: `${modulesWithStudents}/${overview.totals.modules} with students`,
      },
      {
        label: "Students awaiting module",
        value: String(overview.hygiene.studentsWithoutModule),
        detail: "Needs assignment",
      },
    ];
  }, [overview]);

  return (
    <div className="enterprise-overview ui-stack-md">
      <div className="enterprise-overview__layout">
        <Card
          title={<span className="overview-title">Enterprise snapshot</span>}
          className="enterprise-overview__card enterprise-overview__snapshot-card"
        >
          {message ? (
            <div className="status-alert status-alert--error">
              <span>{message}</span>
            </div>
          ) : null}

          <div className="ui-grid-metrics">
            {[
              { label: "Users", value: overview?.totals.users },
              { label: "Active users", value: overview?.totals.activeUsers },
              { label: "Modules", value: overview?.totals.modules },
              { label: "Teams", value: overview?.totals.teams },
              { label: "Meetings", value: overview?.totals.meetings },
            ].map((item) => (
              <div key={item.label} className="ui-metric-card">
                <span className="eyebrow">{item.label}</span>
                <strong className="ui-metric-value">{item.value ?? (status === "loading" ? "…" : 0)}</strong>
              </div>
            ))}
          </div>

          <div className="ui-grid-metrics">
            {[
              { label: "Students", value: overview?.totals.students },
              { label: "Staff", value: overview?.totals.staff },
              { label: "Enterprise admins", value: overview?.totals.enterpriseAdmins },
              { label: "Admins", value: overview?.totals.admins },
            ].map((item) => (
              <div key={item.label} className="ui-metric-card">
                <span className="eyebrow">{item.label}</span>
                <strong className="ui-metric-value">{item.value ?? (status === "loading" ? "…" : 0)}</strong>
              </div>
            ))}
          </div>
        </Card>

        <div className="enterprise-overview__side">
          <Card title="Action queue" className="enterprise-overview__card">
            {status === "loading" ? (
              <p className="muted">Checking enterprise action items…</p>
            ) : actionItems.length > 0 ? (
              <ul className="ui-bullet-list enterprise-overview__action-list">
                {actionItems.map((item) => (
                  <li key={item.label}>
                    {item.label}: <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No urgent action items right now.</p>
            )}
          </Card>

          <Card title="Recent movement (30 days)" className="enterprise-overview__card">
            <div className="ui-grid-metrics">
              {[
                { label: "New users", value: overview?.trends.newUsers30d },
                { label: "New modules", value: overview?.trends.newModules30d },
              ].map((item) => (
                <div key={item.label} className="ui-metric-card">
                  <span className="eyebrow">{item.label}</span>
                  <strong className="ui-metric-value">{item.value ?? (status === "loading" ? "…" : 0)}</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Quick health checks" className="enterprise-overview__card">
            {status === "loading" ? (
              <p className="muted">Calculating health checks…</p>
            ) : (
              <div className="ui-grid-metrics">
                {quickHealthChecks.map((item) => (
                  <div key={item.label} className="ui-metric-card">
                    <span className="eyebrow">{item.label}</span>
                    <strong className="ui-metric-value">{item.value}</strong>
                    <span className="muted">{item.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function formatPercent(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}
