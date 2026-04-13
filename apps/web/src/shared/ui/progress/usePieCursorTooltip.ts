"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent, type MouseEvent } from "react";

type TooltipPosition = { x: number; y: number };
type UseChartCursorTooltipOptions = { offsetX?: number; offsetY?: number; jitterThreshold?: number; verticalPadding?: number; tooltipHeightEstimate?: number };
type PositioningOptions = { offsetX: number; offsetY: number; jitterThreshold: number; verticalPadding: number; tooltipHeightEstimate: number };
type RechartsHoverState = {
  chartX?: number;
  chartY?: number;
  isTooltipActive?: boolean;
  activeTooltipIndex?: number;
  activePayload?: unknown[];
  activeCoordinate?: { x?: number; y?: number };
};

function resolveTooltipWrapperFromEventTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof SVGElement)) {
    return null;
  }
  const wrapper = target.ownerSVGElement?.closest(".recharts-wrapper");
  return wrapper instanceof HTMLElement ? wrapper : null;
}

function resolvePieEntryName(sector: unknown): string | number | null {
  if (!sector || typeof sector !== "object") {
    return null;
  }
  const source = sector as { name?: unknown; payload?: unknown };
  const payload = source.payload && typeof source.payload === "object" ? source.payload as { name?: unknown } : null;
  const candidate = source.name ?? payload?.name;
  return typeof candidate === "string" || typeof candidate === "number" ? candidate : null;
}

function shouldReuseTooltipPosition(previousPosition: TooltipPosition | undefined, nextPosition: TooltipPosition, jitterThreshold: number): boolean {
  if (!previousPosition) {
    return false;
  }
  return Math.abs(previousPosition.x - nextPosition.x) < jitterThreshold && Math.abs(previousPosition.y - nextPosition.y) < jitterThreshold;
}

function resolveTooltipPositionFromClientPoint(clientX: number, clientY: number, wrapper: HTMLElement, options: PositioningOptions): TooltipPosition {
  const bounds = wrapper.getBoundingClientRect();
  const rawY = clientY - bounds.top + options.offsetY;
  const maxY = Math.max(options.verticalPadding, bounds.height - options.tooltipHeightEstimate - options.verticalPadding);
  return { x: clientX - bounds.left + options.offsetX, y: Math.max(options.verticalPadding, Math.min(rawY, maxY)) };
}

function resolveChartCoordinate(primary: unknown, fallback: unknown): number | null {
  if (typeof primary === "number") {
    return primary;
  }
  return typeof fallback === "number" ? fallback : null;
}

function resolveTooltipStateHasActiveSeries(state: RechartsHoverState | undefined): boolean {
  if (typeof state?.activeTooltipIndex === "number" && state.activeTooltipIndex >= 0) {
    return true;
  }
  return Array.isArray(state?.activePayload) && state.activePayload.length > 0;
}

function resolveTooltipStateIsActive(state: RechartsHoverState | undefined): boolean {
  if (!state) {
    return false;
  }
  if (typeof state.isTooltipActive === "boolean") {
    return state.isTooltipActive;
  }
  return resolveTooltipStateHasActiveSeries(state);
}

function resolveTooltipChartCoordinates(state: RechartsHoverState | undefined): TooltipPosition | null {
  const x = resolveChartCoordinate(state?.activeCoordinate?.x, state?.chartX);
  const y = resolveChartCoordinate(state?.activeCoordinate?.y, state?.chartY);
  if (x === null || y === null) {
    return null;
  }
  return { x, y };
}

function resolveTooltipPositionFromChartState(state: RechartsHoverState | undefined, offsetX: number, offsetY: number): TooltipPosition | null {
  if (!resolveTooltipStateIsActive(state)) {
    return null;
  }
  const basePosition = resolveTooltipChartCoordinates(state);
  if (!basePosition) {
    return null;
  }
  return { x: basePosition.x + offsetX, y: basePosition.y + offsetY };
}

function useTooltipQueue(jitterThreshold: number) {
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>();
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const tooltipRafIdRef = useRef<number | null>(null);
  const pendingTooltipPositionRef = useRef<TooltipPosition | null>(null);
  const flushTooltipPosition = useCallback(() => {
    tooltipRafIdRef.current = null;
    const nextPosition = pendingTooltipPositionRef.current;
    if (!nextPosition) {
      return;
    }
    setTooltipPosition((previousPosition) => shouldReuseTooltipPosition(previousPosition, nextPosition, jitterThreshold) ? previousPosition : nextPosition);
    setIsTooltipVisible(true);
  }, [jitterThreshold]);
  const queueTooltipPosition = useCallback((nextPosition: TooltipPosition) => {
    pendingTooltipPositionRef.current = nextPosition;
    if (tooltipRafIdRef.current === null) {
      tooltipRafIdRef.current = window.requestAnimationFrame(flushTooltipPosition);
    }
  }, [flushTooltipPosition]);
  const hideTooltip = useCallback(() => { pendingTooltipPositionRef.current = null; setIsTooltipVisible(false); }, []);
  const clearTooltipPosition = useCallback(() => {
    pendingTooltipPositionRef.current = null;
    if (tooltipRafIdRef.current !== null) { window.cancelAnimationFrame(tooltipRafIdRef.current); tooltipRafIdRef.current = null; }
    setIsTooltipVisible(false);
    setTooltipPosition(undefined);
  }, []);
  useEffect(() => () => { if (tooltipRafIdRef.current !== null) { window.cancelAnimationFrame(tooltipRafIdRef.current); } }, []);
  return { tooltipPosition, isTooltipVisible, queueTooltipPosition, hideTooltip, clearTooltipPosition };
}

function useTooltipPositioning(options: PositioningOptions) {
  const queue = useTooltipQueue(options.jitterThreshold);
  const queueTooltipPositionFromClientPoint = useCallback(
    (clientX: number, clientY: number, wrapper: HTMLElement) => queue.queueTooltipPosition(resolveTooltipPositionFromClientPoint(clientX, clientY, wrapper, options)),
    [options, queue],
  );
  const queueTooltipPositionFromChart = useCallback((state?: RechartsHoverState) => {
    const nextPosition = resolveTooltipPositionFromChartState(state, options.offsetX, options.offsetY);
    if (!nextPosition) { queue.hideTooltip(); return; }
    queue.queueTooltipPosition(nextPosition);
  }, [options.offsetX, options.offsetY, queue]);
  const queueTooltipPositionFromEvent = useCallback((event?: MouseEvent<SVGGraphicsElement>) => {
    if (!event) { return; }
    const wrapper = resolveTooltipWrapperFromEventTarget(event.currentTarget);
    if (!wrapper) { return; }
    queueTooltipPositionFromClientPoint(event.clientX, event.clientY, wrapper);
  }, [queueTooltipPositionFromClientPoint]);
  return { ...queue, queueTooltipPositionFromClientPoint, queueTooltipPositionFromChart, queueTooltipPositionFromEvent };
}

function usePieEntryTracking(queueTooltipPositionFromEvent: (event?: MouseEvent<SVGGraphicsElement>) => void) {
  const [activePieEntryName, setActivePieEntryName] = useState<string | number | null>(null);
  const shouldTrackFromContainerRef = useRef(false);
  const queuePieTooltip = useCallback((sector: unknown, event?: MouseEvent<SVGGraphicsElement>) => {
    shouldTrackFromContainerRef.current = true;
    const pieEntryName = resolvePieEntryName(sector);
    if (pieEntryName != null) {
      setActivePieEntryName((previousName) => previousName === pieEntryName ? previousName : pieEntryName);
    }
    queueTooltipPositionFromEvent(event);
  }, [queueTooltipPositionFromEvent]);
  const clearPieTracking = useCallback(() => { shouldTrackFromContainerRef.current = false; setActivePieEntryName(null); }, []);
  return { activePieEntryName, shouldTrackFromContainerRef, queuePieTooltip, clearPieTracking };
}

function buildTooltipProps(isTooltipVisible: boolean, tooltipPosition: TooltipPosition | undefined) {
  return {
    isAnimationActive: false,
    trigger: "hover" as const,
    cursor: false as const,
    active: isTooltipVisible && Boolean(tooltipPosition),
    ...(tooltipPosition ? { position: tooltipPosition } : {}),
    wrapperStyle: { pointerEvents: "none", userSelect: "none", WebkitUserSelect: "none", zIndex: 20 } as const,
  };
}

function useContainerTooltipHandlers(params: {
  isTooltipVisible: boolean;
  shouldTrackFromContainerRef: React.MutableRefObject<boolean>;
  queueTooltipPositionFromClientPoint: (clientX: number, clientY: number, wrapper: HTMLElement) => void;
  clearTooltip: () => void;
}) {
  const onMouseMove = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!params.isTooltipVisible || !params.shouldTrackFromContainerRef.current) { return; }
    if (!(event.target instanceof SVGElement)) { return; }
    const wrapper = event.currentTarget.querySelector(".recharts-wrapper");
    if (!(wrapper instanceof HTMLElement)) { return; }
    params.queueTooltipPositionFromClientPoint(event.clientX, event.clientY, wrapper);
  }, [params]);
  return {
    onMouseDownCapture: (event: MouseEvent<HTMLElement>) => event.preventDefault(),
    onDragStart: (event: DragEvent<HTMLElement>) => event.preventDefault(),
    onMouseMove,
    onMouseLeave: params.clearTooltip,
    onPointerLeave: params.clearTooltip,
    onBlurCapture: params.clearTooltip,
  };
}

export function useChartCursorTooltip(options: UseChartCursorTooltipOptions = {}) {
  const positioning = useTooltipPositioning({
    offsetX: options.offsetX ?? 12,
    offsetY: options.offsetY ?? 12,
    jitterThreshold: options.jitterThreshold ?? 0.5,
    verticalPadding: options.verticalPadding ?? 8,
    tooltipHeightEstimate: options.tooltipHeightEstimate ?? 78,
  });
  const pieTracking = usePieEntryTracking(positioning.queueTooltipPositionFromEvent);
  const clearTooltip = useCallback(() => { pieTracking.clearPieTracking(); positioning.clearTooltipPosition(); }, [pieTracking, positioning]);
  const containerHandlers = useContainerTooltipHandlers({
    isTooltipVisible: positioning.isTooltipVisible,
    shouldTrackFromContainerRef: pieTracking.shouldTrackFromContainerRef,
    queueTooltipPositionFromClientPoint: positioning.queueTooltipPositionFromClientPoint,
    clearTooltip,
  });
  return {
    pieHandlers: {
      onMouseEnter: (sector: unknown, _index: number, event?: MouseEvent<SVGGraphicsElement>) => pieTracking.queuePieTooltip(sector, event),
      onMouseMove: (sector: unknown, _index: number, event?: MouseEvent<SVGGraphicsElement>) => pieTracking.queuePieTooltip(sector, event),
      onMouseLeave: () => { /* Keep following through donut hole; clear on container leave instead. */ },
    },
    chartHandlers: { onMouseMove: (state: RechartsHoverState) => positioning.queueTooltipPositionFromChart(state), onMouseLeave: clearTooltip },
    containerHandlers,
    tooltipProps: buildTooltipProps(positioning.isTooltipVisible, positioning.tooltipPosition),
    pieTooltipContentProps: { preferredEntryName: pieTracking.activePieEntryName, maxItems: 1 },
  };
}

export const usePieCursorTooltip = useChartCursorTooltip;
