import type React from "react";

export const githubProjectReposClientStyles = {
  panel: {
    border: "1px solid var(--border)",
    borderRadius: 12,
    background: "var(--surface)",
    padding: 16,
    boxShadow: "var(--shadow-sm)",
  } as React.CSSProperties,
  row: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  } as React.CSSProperties,
  list: { marginTop: 10 } as React.CSSProperties,
  select: {
    width: "100%",
    minHeight: 40,
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "8px 10px",
    background: "var(--surface)",
    color: "var(--ink)",
  } as React.CSSProperties,
  tabBarPanel: {
    ...({
      border: "1px solid var(--border)",
      borderRadius: 14,
      background:
        "linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, var(--accent) 8%), var(--surface))",
      padding: 10,
      boxShadow: "var(--shadow-sm)",
    } as React.CSSProperties),
  } as React.CSSProperties,
  tabRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  } as React.CSSProperties,
  tabButton: {
    borderRadius: 10,
    minHeight: 38,
    paddingInline: 12,
  } as React.CSSProperties,
  tabButtonActive: {
    boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent)",
  } as React.CSSProperties,
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 4,
  } as React.CSSProperties,
  sectionTitleWrap: {
    display: "grid",
    gap: 2,
  } as React.CSSProperties,
  sectionKicker: {
    margin: 0,
    color: "var(--muted)",
    fontSize: 12,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  } as React.CSSProperties,
  statusBanner: {
    borderRadius: 12,
    border: "1px solid var(--border)",
    padding: "10px 12px",
    background: "var(--surface)",
    boxShadow: "var(--shadow-sm)",
  } as React.CSSProperties,
  statusInfo: {
    borderColor: "color-mix(in srgb, var(--accent) 35%, var(--border))",
    background: "color-mix(in srgb, var(--accent) 10%, var(--surface))",
  } as React.CSSProperties,
  statusError: {
    borderColor: "color-mix(in srgb, #ef4444 35%, var(--border))",
    background: "color-mix(in srgb, #ef4444 8%, var(--surface))",
  } as React.CSSProperties,
};
