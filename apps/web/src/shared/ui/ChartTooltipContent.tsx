"use client";

import type { CSSProperties, ReactNode } from "react";
import type { TooltipContentProps } from "recharts";

type ChartTooltipValue = number | string | ReadonlyArray<number | string>;
type ChartTooltipName = string | number;
type RawChartTooltipProps = TooltipContentProps<ChartTooltipValue, ChartTooltipName>;
type ChartTooltipProps = Partial<RawChartTooltipProps>;
type ChartTooltipExtraProps = {
  className?: string;
  maxItems?: number;
  preferredEntryName?: string | number | null;
};
type TooltipEntry = NonNullable<RawChartTooltipProps["payload"]>[number];

type FormattedTooltipEntry = {
  color: string;
  name: ReactNode;
  value: ReactNode;
};

const SWATCH_STYLE = (color: string) => ({ "--ui-chart-tooltip-swatch": color } as CSSProperties);

function resolveEntryColor(entry: TooltipEntry) {
  return entry.color ?? entry.stroke ?? entry.fill ?? "var(--ink-strong)";
}

function resolvePayloadName(entry: TooltipEntry): unknown {
  if (!entry.payload || typeof entry.payload !== "object") {
    return undefined;
  }
  if (!("name" in entry.payload)) {
    return undefined;
  }
  return (entry.payload as { name?: unknown }).name;
}

function scopeTooltipEntries(entries: ReadonlyArray<TooltipEntry>, preferredEntryName?: string | number | null): ReadonlyArray<TooltipEntry> {
  if (preferredEntryName == null) {
    return entries;
  }
  const matches = entries.filter((entry) => entry.name === preferredEntryName || resolvePayloadName(entry) === preferredEntryName);
  return matches.length > 0 ? matches : entries;
}

function normalizeEntryName(name: ReactNode) {
  return name == null || name === "" ? "Value" : name;
}

function normalizeEntryValue(value: ReactNode) {
  return value == null || value === "" ? "—" : value;
}

function formatEntry(entry: TooltipEntry, index: number, payload: ReadonlyArray<TooltipEntry>, formatter: ChartTooltipProps["formatter"]): FormattedTooltipEntry {
  let formattedName: ReactNode = entry.name;
  let formattedValue: ReactNode = entry.value;
  const entryFormatter = entry.formatter ?? formatter;
  if (typeof entryFormatter === "function") {
    const result = entryFormatter(entry.value, entry.name, entry, index, payload);
    if (Array.isArray(result)) {
      formattedValue = result[0];
      formattedName = result[1];
    } else if (result != null) {
      formattedValue = result;
    }
  }
  return { color: resolveEntryColor(entry), name: normalizeEntryName(formattedName), value: normalizeEntryValue(formattedValue) };
}

function hasActivePayload(active: boolean | undefined, payload: ChartTooltipProps["payload"]) {
  return Boolean(active && payload && payload.length > 0);
}

function isVisibleTooltipEntry(entry: TooltipEntry | undefined, filterNull: boolean) {
  if (!entry || entry.hide) {
    return false;
  }
  if (!filterNull) {
    return true;
  }
  return entry.value !== null && entry.value !== undefined;
}

function getVisibleEntries(payload: ReadonlyArray<TooltipEntry>, filterNull: boolean) {
  return payload.filter((entry) => isVisibleTooltipEntry(entry, filterNull));
}

function applyTooltipMaxItems(entries: ReadonlyArray<TooltipEntry>, maxItems?: number) {
  if (typeof maxItems !== "number" || maxItems <= 0) {
    return entries;
  }
  return entries.slice(0, maxItems);
}

function getRenderedEntries(payload: ReadonlyArray<TooltipEntry>, filterNull: boolean, preferredEntryName?: string | number | null, maxItems?: number) {
  const visibleEntries = getVisibleEntries(payload, filterNull);
  if (visibleEntries.length === 0) {
    return [];
  }
  const scopedEntries = scopeTooltipEntries(visibleEntries, preferredEntryName);
  return applyTooltipMaxItems(scopedEntries, maxItems);
}

function formatTooltipLabel(label: ChartTooltipProps["label"], renderedEntries: ReadonlyArray<TooltipEntry>, labelFormatter: ChartTooltipProps["labelFormatter"]) {
  return typeof labelFormatter === "function" ? labelFormatter(label, renderedEntries) : label;
}

function buildTooltipClassName(className: string | undefined) {
  return className ? `ui-chart-tooltip ${className}` : "ui-chart-tooltip";
}

function TooltipLabel({ label }: { label: ReactNode }) {
  return label != null ? <p className="ui-chart-tooltip__label">{label}</p> : null;
}

function TooltipRow({ entry, index, payload, formatter }: { entry: TooltipEntry; index: number; payload: ReadonlyArray<TooltipEntry>; formatter: ChartTooltipProps["formatter"] }) {
  const row = formatEntry(entry, index, payload, formatter);
  return (
    <li key={`${entry.dataKey ?? "item"}-${index}`} className="ui-chart-tooltip__item">
      <span className="ui-chart-tooltip__swatch" style={SWATCH_STYLE(row.color)} aria-hidden="true" />
      <span className="ui-chart-tooltip__name">{row.name}</span>
      <span className="ui-chart-tooltip__value">{row.value}</span>
    </li>
  );
}

function TooltipList({ entries, formatter }: { entries: ReadonlyArray<TooltipEntry>; formatter: ChartTooltipProps["formatter"] }) {
  return (
    <ul className="ui-chart-tooltip__list">
      {entries.map((entry, index) => (
        <TooltipRow key={`${entry.dataKey ?? "item"}-${index}`} entry={entry} index={index} payload={entries} formatter={formatter} />
      ))}
    </ul>
  );
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  filterNull = true,
  className,
  maxItems,
  preferredEntryName,
}: ChartTooltipProps & ChartTooltipExtraProps) {
  if (!hasActivePayload(active, payload)) {
    return null;
  }
  const renderedEntries = getRenderedEntries(payload, filterNull, preferredEntryName, maxItems);
  if (renderedEntries.length === 0) {
    return null;
  }
  const formattedLabel = formatTooltipLabel(label, renderedEntries, labelFormatter);
  const tooltipClassName = buildTooltipClassName(className);
  return (
    <div className={tooltipClassName} role="status" aria-live="polite">
      <TooltipLabel label={formattedLabel} />
      <TooltipList entries={renderedEntries} formatter={formatter} />
    </div>
  );
}
