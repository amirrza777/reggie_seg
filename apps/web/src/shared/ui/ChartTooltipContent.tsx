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

const SWATCH_STYLE = (color: string) =>
  ({ "--ui-chart-tooltip-swatch": color } as CSSProperties);

function resolveEntryColor(entry: TooltipEntry) {
  return entry.color ?? entry.stroke ?? entry.fill ?? "var(--ink-strong)";
}

function resolvePayloadName(entry: TooltipEntry): unknown {
  if (!entry.payload || typeof entry.payload !== "object") return undefined;
  if (!("name" in entry.payload)) return undefined;
  return (entry.payload as { name?: unknown }).name;
}

function scopeTooltipEntries(
  entries: ReadonlyArray<TooltipEntry>,
  preferredEntryName?: string | number | null,
): ReadonlyArray<TooltipEntry> {
  if (preferredEntryName == null) return entries;

  const matches = entries.filter((entry) => {
    return entry.name === preferredEntryName || resolvePayloadName(entry) === preferredEntryName;
  });

  return matches.length > 0 ? matches : entries;
}

function normalizeEntryName(name: ReactNode) {
  if (name == null || name === "") return "Value";
  return name;
}

function normalizeEntryValue(value: ReactNode) {
  if (value == null || value === "") return "—";
  return value;
}

function formatEntry(
  entry: TooltipEntry,
  index: number,
  payload: ReadonlyArray<TooltipEntry>,
  formatter: ChartTooltipProps["formatter"],
): FormattedTooltipEntry {
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

  return {
    color: resolveEntryColor(entry),
    name: normalizeEntryName(formattedName),
    value: normalizeEntryValue(formattedValue),
  };
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
  if (!active || !payload || payload.length === 0) return null;

  const visibleEntries = payload.filter((entry) => {
    if (!entry || entry.hide) return false;
    if (!filterNull) return true;
    return entry.value !== null && entry.value !== undefined;
  });

  if (visibleEntries.length === 0) return null;

  const scopedEntries = scopeTooltipEntries(visibleEntries, preferredEntryName);

  const renderedEntries =
    typeof maxItems === "number" && maxItems > 0
      ? scopedEntries.slice(0, maxItems)
      : scopedEntries;

  if (renderedEntries.length === 0) return null;

  const formattedLabel =
    typeof labelFormatter === "function"
      ? labelFormatter(label, renderedEntries)
      : label;
  const tooltipClassName = className ? `ui-chart-tooltip ${className}` : "ui-chart-tooltip";

  return (
    <div className={tooltipClassName} role="status" aria-live="polite">
      {formattedLabel != null ? (
        <p className="ui-chart-tooltip__label">{formattedLabel}</p>
      ) : null}
      <ul className="ui-chart-tooltip__list">
        {renderedEntries.map((entry, index) => {
          const row = formatEntry(entry, index, renderedEntries, formatter);
          return (
            <li key={`${entry.dataKey ?? "item"}-${index}`} className="ui-chart-tooltip__item">
              <span className="ui-chart-tooltip__swatch" style={SWATCH_STYLE(row.color)} aria-hidden="true" />
              <span className="ui-chart-tooltip__name">{row.name}</span>
              <span className="ui-chart-tooltip__value">{row.value}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
