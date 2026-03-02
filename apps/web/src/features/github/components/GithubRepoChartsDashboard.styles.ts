"use client";

import type React from "react";

export const chartDashboardStyles = {
  chartSection: {
    marginTop: 12,
    paddingTop: 4,
    borderTop: "1px solid var(--border)",
  } as React.CSSProperties,
  sectionLabel: {
    marginTop: 2,
    marginBottom: 4,
    color: "var(--muted)",
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  } as React.CSSProperties,
  chartGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
    gap: 10,
    alignItems: "start",
  } as React.CSSProperties,
  chartWrap: {
    marginTop: 10,
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: 10,
    background: "var(--surface)",
  } as React.CSSProperties,
  chartColFull: { gridColumn: "1 / -1" } as React.CSSProperties,
  chartColHalf: { gridColumn: "span 6" } as React.CSSProperties,
  insightGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
    marginTop: 8,
  } as React.CSSProperties,
  insightCard: {
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: 10,
    background: "var(--surface)",
  } as React.CSSProperties,
  insightLabel: {
    fontSize: 12,
    color: "var(--muted)",
    marginBottom: 4,
  } as React.CSSProperties,
  insightValue: {
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1.05,
  } as React.CSSProperties,
  insightSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: "var(--muted)",
  } as React.CSSProperties,
};

