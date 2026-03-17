"use client";

import Link from "next/link";
import { Card } from "@/shared/ui/Card";
import { useEnterpriseOverviewSummary } from "./useEnterpriseOverviewSummary";

export function EnterpriseOverviewSummary() {
  const {
    overview,
    status,
    message,
    riskItems,
    quickHealthChecks,
    operationalRatios,
    actionQueue,
    priorityActionCount,
    roleDistribution,
    setupChecklist,
    completedChecklistItems,
    lastUpdatedLabel,
    priorityBanner,
  } = useEnterpriseOverviewSummary();

  const snapshotPrimary = [
    { label: "Users", value: overview?.totals.users },
    { label: "Active users", value: overview?.totals.activeUsers },
    { label: "Modules", value: overview?.totals.modules },
    { label: "Teams", value: overview?.totals.teams },
    { label: "Meetings", value: overview?.totals.meetings },
  ];

  const snapshotRoles = [
    { label: "Students", value: overview?.totals.students },
    { label: "Staff", value: overview?.totals.staff },
    { label: "Enterprise admins", value: overview?.totals.enterpriseAdmins },
  ];

  const recentMovement = [
    { label: "New users", value: overview?.trends.newUsers30d },
    { label: "New modules", value: overview?.trends.newModules30d },
  ];

  return (
    <div className="enterprise-overview ui-stack-md">
      <div
        className={`status-alert enterprise-overview__priority-banner ${
          priorityBanner.tone === "error" ? "status-alert--error" : "status-alert--success"
        }`}
      >
        <span>{priorityBanner.text}</span>
      </div>

      <div className="enterprise-overview__layout">
        <div className="enterprise-overview__main">
          <Card
            title={<span className="overview-title">Enterprise snapshot</span>}
            className="enterprise-overview__card enterprise-overview__snapshot-card"
          >
            {message ? (
              <div className="status-alert status-alert--error">
                <span>{message}</span>
              </div>
            ) : null}

            <MetricGrid items={snapshotPrimary} status={status} />
            <MetricGrid items={snapshotRoles} status={status} />

            {lastUpdatedLabel ? (
              <p className="ui-note ui-note--muted enterprise-overview__meta">Last updated: {lastUpdatedLabel}</p>
            ) : null}
          </Card>

          <Card title="Setup checklist" className="enterprise-overview__card">
            <div className="enterprise-overview__checklist">
              <p className="ui-note ui-note--muted">
                {completedChecklistItems}/{setupChecklist.length} setup checks complete
              </p>
              {setupChecklist.map((item) => (
                <div key={item.label} className="enterprise-overview__checklist-row">
                  <span>{item.label}</span>
                  <span className={`status-chip ${item.complete ? "status-chip--success" : "status-chip--danger"}`}>
                    {item.complete ? "Done" : `${item.pending} open`}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Role distribution" className="enterprise-overview__card">
            {status === "loading" ? (
              <p className="muted">Calculating role distribution…</p>
            ) : (
              <div className="enterprise-overview__role-list">
                {roleDistribution.map((role) => (
                  <div key={role.label} className="enterprise-overview__role-row">
                    <span className="enterprise-overview__role-label">{role.label}</span>
                    <div className="enterprise-overview__role-track" aria-hidden="true">
                      <span className="enterprise-overview__role-fill" style={{ width: `${role.percent}%` }} />
                    </div>
                    <span className="enterprise-overview__role-value">
                      {role.value} ({role.percent}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="enterprise-overview__side">
          <Card title="Quick actions" className="enterprise-overview__card">
            <div className="enterprise-overview__quick-actions">
              <Link href="/enterprise/modules" className="btn btn--ghost">
                Open module management
              </Link>
            </div>
            <p className="ui-note ui-note--muted">Use module management to set up modules and allocate coverage.</p>
          </Card>

          <Card title="Top risks" className="enterprise-overview__card">
            {status === "loading" ? (
              <p className="muted">Evaluating enterprise risks…</p>
            ) : riskItems.length > 0 ? (
              <ul className="ui-bullet-list enterprise-overview__risk-list">
                {riskItems.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No open risk items.</p>
            )}
          </Card>

          <Card title="Recent movement (30 days)" className="enterprise-overview__card">
            <MetricGrid items={recentMovement} status={status} />
          </Card>

          <Card title="Operational ratios" className="enterprise-overview__card">
            <div className="ui-grid-metrics">
              {operationalRatios.map((item) => (
                <div key={item.label} className="ui-metric-card">
                  <span className="eyebrow">{item.label}</span>
                  <strong className="ui-metric-value">{item.value}</strong>
                  <span className="muted">{item.detail}</span>
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

      <Card
        title="Priority action queue"
        className="enterprise-overview__card"
        bodyClassName="enterprise-overview__action-queue-body"
      >
        {status === "loading" ? (
          <p className="muted">Building priority actions…</p>
        ) : (
          <div className="enterprise-overview__action-queue">
            <p className="ui-note ui-note--muted enterprise-overview__action-queue-note">
              {priorityActionCount > 0
                ? `${priorityActionCount} priority actions generated from current setup and growth signals.`
                : "No priority actions at the moment. Keep monitoring for changes."}
            </p>
            {actionQueue.map((item) => (
              <div key={item.id} className="enterprise-overview__action-row">
                <div className="enterprise-overview__action-copy">
                  <div className="enterprise-overview__action-head">
                    <span className={`enterprise-overview__action-tone enterprise-overview__action-tone--${item.tone}`}>
                      {item.tone === "critical" ? "Now" : item.tone === "attention" ? "Next" : "Healthy"}
                    </span>
                    <strong>{item.label}</strong>
                  </div>
                  <p className="muted">{item.detail}</p>
                </div>
                <Link href={item.href} className="btn btn--ghost enterprise-overview__action-link">
                  {item.cta}
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

type MetricGridItem = {
  label: string;
  value: number | undefined;
};

type MetricGridProps = {
  items: MetricGridItem[];
  status: "idle" | "loading" | "success" | "error";
};

function MetricGrid({ items, status }: MetricGridProps) {
  return (
    <div className="ui-grid-metrics">
      {items.map((item) => (
        <div key={item.label} className="ui-metric-card">
          <span className="eyebrow">{item.label}</span>
          <strong className="ui-metric-value">{item.value ?? (status === "loading" ? "…" : 0)}</strong>
        </div>
      ))}
    </div>
  );
}
