"use client";

import { useEffect, useMemo, useState } from "react";
import { getEnterpriseOverview } from "../api/client";
import type { EnterpriseOverview } from "../types";

type RequestState = "idle" | "loading" | "success" | "error";
type ActionQueueTone = "critical" | "attention" | "healthy";

type ActionQueueItem = {
  id: string;
  label: string;
  detail: string;
  tone: ActionQueueTone;
  href: string;
  cta: string;
  impact: number;
};

type PriorityBanner = {
  tone: "success" | "error";
  text: string;
};

type OverviewValue = {
  label: string;
  value: number;
};

type RoleDistributionItem = {
  label: string;
  value: number;
  percent: number;
};

type ChecklistItem = {
  label: string;
  complete: boolean;
  pending: number;
};

export function useEnterpriseOverviewSummary() {
  const [overview, setOverview] = useState<EnterpriseOverview | null>(null);
  const [status, setStatus] = useState<RequestState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  useEffect(() => {
    const loadOverview = async () => {
      setStatus("loading");
      setMessage(null);

      try {
        const response = await getEnterpriseOverview();
        setOverview(response);
        setLoadedAt(new Date());
        setStatus("success");
      } catch (err) {
        setStatus("error");
        setLoadedAt(null);
        setMessage(err instanceof Error ? err.message : "Could not load enterprise overview.");
      }
    };

    void loadOverview();
  }, []);

  const riskItems = useMemo<OverviewValue[]>(() => {
    if (!overview) return [];

    const items: OverviewValue[] = [
      { label: "Inactive accounts to review", value: overview.hygiene.inactiveUsers },
      { label: "Students not assigned to a module", value: overview.hygiene.studentsWithoutModule },
      { label: "Modules with no students", value: overview.hygiene.modulesWithoutStudents },
    ];

    return items.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
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
    ];
  }, [overview]);

  const operationalRatios = useMemo(() => {
    if (!overview) return [];

    const studentsAssigned = Math.max(overview.totals.students - overview.hygiene.studentsWithoutModule, 0);
    const modulesWithStudents = Math.max(overview.totals.modules - overview.hygiene.modulesWithoutStudents, 0);
    const enterpriseLeads = overview.totals.enterpriseAdmins;

    return [
      {
        label: "Students / active module",
        value: formatDecimalRatio(studentsAssigned, modulesWithStudents),
        detail: `${studentsAssigned} students across ${modulesWithStudents} active modules`,
      },
      {
        label: "Students / team",
        value: formatDecimalRatio(overview.totals.students, overview.totals.teams),
        detail: `${overview.totals.students} students across ${overview.totals.teams} teams`,
      },
      {
        label: "Active users / enterprise admin",
        value: formatDecimalRatio(overview.totals.activeUsers, enterpriseLeads),
        detail: `${overview.totals.activeUsers} active users across ${enterpriseLeads} enterprise admins`,
      },
    ];
  }, [overview]);

  const actionQueue = useMemo<ActionQueueItem[]>(() => {
    if (!overview) return [];

    const actions: ActionQueueItem[] = [];
    const users = overview.totals.users;
    const activeUsers = overview.totals.activeUsers;
    const students = overview.totals.students;
    const teams = overview.totals.teams;
    const modules = overview.totals.modules;
    const enterpriseAdmins = overview.totals.enterpriseAdmins;
    const inactiveUsers = overview.hygiene.inactiveUsers;
    const studentsWithoutModule = overview.hygiene.studentsWithoutModule;
    const modulesWithoutStudents = overview.hygiene.modulesWithoutStudents;
    const newUsers30d = overview.trends.newUsers30d;
    const newModules30d = overview.trends.newModules30d;
    const activeAccountRate = users > 0 ? activeUsers / users : 1;

    if (studentsWithoutModule > 0) {
      actions.push({
        id: "students-unassigned",
        label: "Assign unplaced students",
        detail: `${studentsWithoutModule} students are not assigned to any module.`,
        tone: "critical",
        href: "/enterprise/modules",
        cta: "Assign students",
        impact: studentsWithoutModule,
      });
    }

    if (teams === 0 && students > 0) {
      actions.push({
        id: "teams-missing",
        label: "Create team structure",
        detail: `${students} students exist, but no teams are configured yet.`,
        tone: "critical",
        href: "/enterprise/modules",
        cta: "Open modules",
        impact: students,
      });
    }

    if (enterpriseAdmins === 0) {
      actions.push({
        id: "admin-ownership",
        label: "Assign enterprise admin ownership",
        detail: "No enterprise admins are assigned for governance and approvals.",
        tone: "critical",
        href: "/admin/enterprises",
        cta: "Open admin",
        impact: activeUsers,
      });
    }

    if (modulesWithoutStudents > 0) {
      actions.push({
        id: "empty-modules",
        label: "Resolve empty modules",
        detail: `${modulesWithoutStudents} modules have no students and need enrollment or cleanup.`,
        tone: "attention",
        href: "/enterprise/modules",
        cta: "Review modules",
        impact: modulesWithoutStudents,
      });
    }

    if (inactiveUsers > 0) {
      actions.push({
        id: "inactive-accounts",
        label: "Follow up inactive accounts",
        detail: `${inactiveUsers} users are inactive and may need access or onboarding support.`,
        tone: "attention",
        href: "/staff/analytics",
        cta: "Review analytics",
        impact: inactiveUsers,
      });
    }

    if (activeAccountRate < 0.9 && users > 0) {
      actions.push({
        id: "activation-rate",
        label: "Lift account activation rate",
        detail: `Only ${formatPercent(activeUsers, users)} of users are active right now.`,
        tone: "attention",
        href: "/staff/analytics",
        cta: "Investigate",
        impact: Math.max(users - activeUsers, 0),
      });
    }

    if (newUsers30d >= 8 && newModules30d === 0 && modules > 0) {
      actions.push({
        id: "capacity-growth",
        label: "Plan module capacity for growth",
        detail: `${newUsers30d} new users joined in 30 days, but module count did not increase.`,
        tone: "attention",
        href: "/enterprise/modules",
        cta: "Plan capacity",
        impact: newUsers30d,
      });
    }

    if (actions.length === 0) {
      actions.push({
        id: "healthy-system",
        label: "No immediate blockers",
        detail: "Coverage, activation, and team setup currently look healthy.",
        tone: "healthy",
        href: "/enterprise/modules",
        cta: "Open modules",
        impact: 0,
      });
    }

    const tonePriority: Record<ActionQueueTone, number> = {
      critical: 0,
      attention: 1,
      healthy: 2,
    };

    return actions
      .sort((a, b) => tonePriority[a.tone] - tonePriority[b.tone] || b.impact - a.impact)
      .slice(0, 5);
  }, [overview]);

  const priorityActionCount = useMemo(
    () => actionQueue.filter((item) => item.tone !== "healthy").length,
    [actionQueue],
  );

  const roleDistribution = useMemo<RoleDistributionItem[]>(() => {
    if (!overview) return [];

    const roles = [
      { label: "Students", value: overview.totals.students },
      { label: "Staff", value: overview.totals.staff },
      { label: "Enterprise admins", value: overview.totals.enterpriseAdmins },
    ];
    const total = roles.reduce((sum, role) => sum + role.value, 0);

    return roles.map((role) => ({
      ...role,
      percent: total > 0 ? Math.round((role.value / total) * 100) : 0,
    }));
  }, [overview]);

  const setupChecklist = useMemo<ChecklistItem[]>(() => {
    if (!overview) return [];

    return [
      {
        label: "Students assigned to modules",
        complete: overview.hygiene.studentsWithoutModule === 0,
        pending: overview.hygiene.studentsWithoutModule,
      },
      {
        label: "Modules have enrolled students",
        complete: overview.hygiene.modulesWithoutStudents === 0,
        pending: overview.hygiene.modulesWithoutStudents,
      },
      {
        label: "All accounts are active",
        complete: overview.hygiene.inactiveUsers === 0,
        pending: overview.hygiene.inactiveUsers,
      },
      {
        label: "Teams set up",
        complete: overview.totals.teams > 0,
        pending: overview.totals.teams > 0 ? 0 : 1,
      },
    ];
  }, [overview]);

  const completedChecklistItems = useMemo(
    () => setupChecklist.reduce((count, item) => count + (item.complete ? 1 : 0), 0),
    [setupChecklist],
  );

  const lastUpdatedLabel = useMemo(() => {
    if (!loadedAt) return null;
    return loadedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }, [loadedAt]);

  const priorityBanner = useMemo<PriorityBanner>(() => {
    if (status === "loading") {
      return { tone: "success", text: "Scanning enterprise setup risks..." };
    }

    if (status === "error") {
      return { tone: "error", text: message ?? "Could not evaluate enterprise setup risks." };
    }

    if (riskItems.length === 0) {
      return { tone: "success", text: "No priority risks detected. Enterprise setup looks healthy." };
    }

    const highestRisk = riskItems[0];
    const extraRisks = riskItems.length - 1;
    return {
      tone: "error",
      text:
        extraRisks > 0
          ? `Priority: ${highestRisk.label} (${highestRisk.value}). Plus ${extraRisks} additional risk areas.`
          : `Priority: ${highestRisk.label} (${highestRisk.value}).`,
    };
  }, [message, riskItems, status]);

  return {
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
  };
}

function formatPercent(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function formatDecimalRatio(value: number, total: number): string {
  if (total <= 0) return "0.0";
  return (value / total).toFixed(1);
}
