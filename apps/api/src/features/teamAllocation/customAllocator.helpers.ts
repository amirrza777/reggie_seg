import type { CustomAllocationRespondent } from "./customAllocator.types.js";

export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const current = result[index]!;
    const swapped = result[swapIndex]!;
    result[index] = swapped;
    result[swapIndex] = current;
  }
  return result;
}

export function normalizeResponseValue(value: unknown): number | string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      return numeric;
    }
    return trimmed;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

export function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function variance(values: number[], valuesMean?: number): number {
  if (values.length < 2) {
    return 0;
  }
  const center = valuesMean ?? mean(values);
  return values.reduce((sum, value) => sum + (value - center) ** 2, 0) / values.length;
}

export function roundToTwo(value: number): number {
  return Number(value.toFixed(2));
}

export function stripResponses<TStudent extends { id: number }>(
  student: TStudent | CustomAllocationRespondent<TStudent>,
): TStudent {
  const copy = { ...(student as Record<string, unknown>) };
  delete copy.responses;
  return copy as TStudent;
}