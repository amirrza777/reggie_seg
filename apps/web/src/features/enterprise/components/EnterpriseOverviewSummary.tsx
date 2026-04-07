"use client";

import Link from "next/link";
import { Card } from "@/shared/ui/Card";
import { useEnterpriseOverviewSummary } from "./useEnterpriseOverviewSummary";

type OverviewSummaryData = ReturnType<typeof useEnterpriseOverviewSummary>;

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

function OverviewErrorMessage({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <div className="status-alert status-alert--error">
      <span>{message}</span>
    </div>
  );
}

function SnapshotCard({
  summary,
  snapshotPrimary,
  snapshotRoles,
}: {
  summary: OverviewSummaryData;
  snapshotPrimary: MetricGridItem[];
  snapshotRoles: MetricGridItem[];
}) {
  return (
    <Card title={<span className="overview-title">Enterprise snapshot</span>} className="enterprise-overview__card enterprise-overview__snapshot-card">
      <OverviewErrorMessage message={summary.message} />
      <MetricGrid items={snapshotPrimary} status={summary.status} />
      <MetricGrid items={snapshotRoles} status={summary.status} />
      {summary.lastUpdatedLabel ? <p className="ui-note ui-note--muted enterprise-overview__meta">Last updated: {summary.lastUpdatedLabel}</p> : null}
    </Card>
  );
}

function SetupChecklistCard({ summary }: { summary: OverviewSummaryData }) {
  return (
    <Card title="Setup checklist" className="enterprise-overview__card">
      <div className="enterprise-overview__checklist">
        <p className="ui-note ui-note--muted">{summary.completedChecklistItems}/{summary.setupChecklist.length} setup checks complete</p>
        {summary.setupChecklist.map((item) => (
          <div key={item.label} className="enterprise-overview__checklist-row">
            <span>{item.label}</span>
            <span className={`status-chip ${item.complete ? "status-chip--success" : "status-chip--danger"}`}>{item.complete ? "Done" : `${item.pending} open`}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RoleDistributionContent({ summary }: { summary: OverviewSummaryData }) {
  if (summary.status === "loading") {
    return <p className="muted">Calculating role distribution…</p>;
  }
  return (
    <div className="enterprise-overview__role-list">
      {summary.roleDistribution.map((role) => (
        <div key={role.label} className="enterprise-overview__role-row">
          <span className="enterprise-overview__role-label">{role.label}</span>
          <div className="enterprise-overview__role-track" aria-hidden="true"><span className="enterprise-overview__role-fill" style={{ width: `${role.percent}%` }} /></div>
          <span className="enterprise-overview__role-value">{role.value} ({role.percent}%)</span>
        </div>
      ))}
    </div>
  );
}

function RoleDistributionCard({ summary }: { summary: OverviewSummaryData }) {
  return (
    <Card title="Role distribution" className="enterprise-overview__card">
      <RoleDistributionContent summary={summary} />
    </Card>
  );
}

function OverviewMainColumn({
  summary,
  snapshotPrimary,
  snapshotRoles,
}: {
  summary: OverviewSummaryData;
  snapshotPrimary: MetricGridItem[];
  snapshotRoles: MetricGridItem[];
}) {
  return (
    <div className="enterprise-overview__main">
      <SnapshotCard summary={summary} snapshotPrimary={snapshotPrimary} snapshotRoles={snapshotRoles} />
      <SetupChecklistCard summary={summary} />
      <RoleDistributionCard summary={summary} />
    </div>
  );
}

function QuickActionsCard() {
  return (
    <Card title="Quick actions" className="enterprise-overview__card">
      <div className="enterprise-overview__quick-actions"><Link href="/enterprise/modules" className="btn btn--ghost">Open module management</Link></div>
      <p className="ui-note ui-note--muted">Use module management to set up modules and allocate coverage.</p>
    </Card>
  );
}

function TopRisksContent({ summary }: { summary: OverviewSummaryData }) {
  if (summary.status === "loading") {
    return <p className="muted">Evaluating enterprise risks…</p>;
  }
  if (summary.riskItems.length === 0) {
    return <p className="muted">No open risk items.</p>;
  }
  return (
    <ul className="ui-bullet-list enterprise-overview__risk-list">
      {summary.riskItems.map((item) => (
        <li key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </li>
      ))}
    </ul>
  );
}

function TopRisksCard({ summary }: { summary: OverviewSummaryData }) {
  return (
    <Card title="Top risks" className="enterprise-overview__card">
      <TopRisksContent summary={summary} />
    </Card>
  );
}

function RecentMovementCard({ summary, recentMovement }: { summary: OverviewSummaryData; recentMovement: MetricGridItem[] }) {
  return (
    <Card title="Recent movement (30 days)" className="enterprise-overview__card">
      <MetricGrid items={recentMovement} status={summary.status} />
    </Card>
  );
}

function OperationalRatiosCard({ summary }: { summary: OverviewSummaryData }) {
  return (
    <Card title="Operational ratios" className="enterprise-overview__card">
      <div className="ui-grid-metrics">
        {summary.operationalRatios.map((item) => (
          <div key={item.label} className="ui-metric-card">
            <span className="eyebrow">{item.label}</span>
            <strong className="ui-metric-value">{item.value}</strong>
            <span className="muted">{item.detail}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function QuickHealthChecksContent({ summary }: { summary: OverviewSummaryData }) {
  if (summary.status === "loading") {
    return <p className="muted">Calculating health checks…</p>;
  }
  return (
    <div className="ui-grid-metrics">
      {summary.quickHealthChecks.map((item) => (
        <div key={item.label} className="ui-metric-card">
          <span className="eyebrow">{item.label}</span>
          <strong className="ui-metric-value">{item.value}</strong>
          <span className="muted">{item.detail}</span>
        </div>
      ))}
    </div>
  );
}

function QuickHealthChecksCard({ summary }: { summary: OverviewSummaryData }) {
  return (
    <Card title="Quick health checks" className="enterprise-overview__card">
      <QuickHealthChecksContent summary={summary} />
    </Card>
  );
}

function OverviewSideColumn({ summary, recentMovement }: { summary: OverviewSummaryData; recentMovement: MetricGridItem[] }) {
  return (
    <div className="enterprise-overview__side">
      <QuickActionsCard />
      <TopRisksCard summary={summary} />
      <RecentMovementCard summary={summary} recentMovement={recentMovement} />
      <OperationalRatiosCard summary={summary} />
      <QuickHealthChecksCard summary={summary} />
    </div>
  );
}

function resolvePriorityToneLabel(tone: "critical" | "attention" | "healthy") {
  if (tone === "critical") {
    return "Now";
  }
  return tone === "attention" ? "Next" : "Healthy";
}

function PriorityActionQueueNote({ summary }: { summary: OverviewSummaryData }) {
  return (
    <p className="ui-note ui-note--muted enterprise-overview__action-queue-note">
      {summary.priorityActionCount > 0 ? `${summary.priorityActionCount} priority actions generated from current setup and growth signals.` : "No priority actions at the moment. Keep monitoring for changes."}
    </p>
  );
}

function PriorityActionQueueRows({ summary }: { summary: OverviewSummaryData }) {
  return (
    <>
      {summary.actionQueue.map((item) => (
        <div key={item.id} className="enterprise-overview__action-row">
          <div className="enterprise-overview__action-copy">
            <div className="enterprise-overview__action-head"><span className={`enterprise-overview__action-tone enterprise-overview__action-tone--${item.tone}`}>{resolvePriorityToneLabel(item.tone)}</span><strong>{item.label}</strong></div>
            <p className="muted">{item.detail}</p>
          </div>
          <Link href={item.href} className="btn btn--ghost enterprise-overview__action-link">{item.cta}</Link>
        </div>
      ))}
    </>
  );
}

function PriorityActionQueue({ summary }: { summary: OverviewSummaryData }) {
  return (
    <Card title="Priority action queue" className="enterprise-overview__card" bodyClassName="enterprise-overview__action-queue-body">
      {summary.status === "loading" ? <p className="muted">Building priority actions…</p> : <div className="enterprise-overview__action-queue"><PriorityActionQueueNote summary={summary} /><PriorityActionQueueRows summary={summary} /></div>}
    </Card>
  );
}

function buildSnapshotPrimary(summary: OverviewSummaryData): MetricGridItem[] {
  return [
    { label: "Users", value: summary.overview?.totals.users },
    { label: "Active users", value: summary.overview?.totals.activeUsers },
    { label: "Modules", value: summary.overview?.totals.modules },
    { label: "Teams", value: summary.overview?.totals.teams },
    { label: "Meetings", value: summary.overview?.totals.meetings },
  ];
}

function buildSnapshotRoles(summary: OverviewSummaryData): MetricGridItem[] {
  return [
    { label: "Students", value: summary.overview?.totals.students },
    { label: "Staff", value: summary.overview?.totals.staff },
    { label: "Enterprise admins", value: summary.overview?.totals.enterpriseAdmins },
  ];
}

function buildRecentMovement(summary: OverviewSummaryData): MetricGridItem[] {
  return [
    { label: "New users", value: summary.overview?.trends.newUsers30d },
    { label: "New modules", value: summary.overview?.trends.newModules30d },
  ];
}

function PriorityBanner({ summary }: { summary: OverviewSummaryData }) {
  const toneClass = summary.priorityBanner.tone === "error" ? "status-alert--error" : "status-alert--success";
  return (
    <div className={`status-alert enterprise-overview__priority-banner ${toneClass}`}>
      <span>{summary.priorityBanner.text}</span>
    </div>
  );
}

export function EnterpriseOverviewSummary() {
  const summary = useEnterpriseOverviewSummary();
  const snapshotPrimary = buildSnapshotPrimary(summary);
  const snapshotRoles = buildSnapshotRoles(summary);
  const recentMovement = buildRecentMovement(summary);
  return (
    <div className="enterprise-overview ui-stack-md">
      <PriorityBanner summary={summary} />
      <div className="enterprise-overview__layout">
        <OverviewMainColumn summary={summary} snapshotPrimary={snapshotPrimary} snapshotRoles={snapshotRoles} />
        <OverviewSideColumn summary={summary} recentMovement={recentMovement} />
      </div>
      <PriorityActionQueue summary={summary} />
    </div>
  );
}
