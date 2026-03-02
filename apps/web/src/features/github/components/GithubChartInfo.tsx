"use client";

import { useState } from "react";
import type React from "react";

export type GithubChartInfoContent = {
  overview: string;
  interpretation: string;
  staffUse: string;
};

type GithubChartTitleWithInfoProps = {
  title: string;
  info: GithubChartInfoContent;
};

const styles = {
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  } as React.CSSProperties,
  titleText: {
    margin: 0,
    color: "var(--muted)",
    fontSize: 14,
    fontWeight: 600,
  } as React.CSSProperties,
  infoButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: "999px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--accent-strong)",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1,
    padding: 0,
  } as React.CSSProperties,
  overlay: {
    position: "fixed",
    inset: 0,
    background: "var(--backdrop-strong)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 1000,
  } as React.CSSProperties,
  modal: {
    width: "min(740px, 100%)",
    maxHeight: "85vh",
    overflowY: "auto",
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "var(--surface-strong, var(--surface))",
    color: "var(--ink)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
  } as React.CSSProperties,
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "16px 18px",
    borderBottom: "1px solid var(--border)",
  } as React.CSSProperties,
  modalTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
  } as React.CSSProperties,
  closeButton: {
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--ink)",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  } as React.CSSProperties,
  body: {
    padding: 18,
    display: "grid",
    gap: 14,
  } as React.CSSProperties,
  infoBlock: {
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--surface)",
    padding: 12,
  } as React.CSSProperties,
  blockLabel: {
    margin: "0 0 6px 0",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.35,
    color: "var(--muted)",
  } as React.CSSProperties,
  blockText: {
    margin: 0,
    lineHeight: 1.55,
    color: "var(--ink)",
  } as React.CSSProperties,
};

export function GithubChartTitleWithInfo({ title, info }: GithubChartTitleWithInfoProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div style={styles.titleRow}>
        <button
          type="button"
          style={styles.infoButton}
          onClick={() => setOpen(true)}
          aria-label={`More information about ${title}`}
          title="More information"
        >
          i
        </button>
        <p style={styles.titleText}>{title}</p>
      </div>

      {open ? (
        <div style={styles.overlay} role="dialog" aria-modal="true" aria-label={`${title} guidance`} onClick={() => setOpen(false)}>
          <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{title}</h3>
              <button type="button" style={styles.closeButton} onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <div style={styles.body}>
              <section style={styles.infoBlock}>
                <p style={styles.blockLabel}>What this shows</p>
                <p style={styles.blockText}>{info.overview}</p>
              </section>
              <section style={styles.infoBlock}>
                <p style={styles.blockLabel}>How to interpret it</p>
                <p style={styles.blockText}>{info.interpretation}</p>
              </section>
              <section style={styles.infoBlock}>
                <p style={styles.blockLabel}>How this may be used</p>
                <p style={styles.blockText}>{info.staffUse}</p>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
