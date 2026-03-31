"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent, type MouseEvent } from "react";

type TooltipPosition = {
  x: number;
  y: number;
};

type UseChartCursorTooltipOptions = {
  offsetX?: number;
  offsetY?: number;
  jitterThreshold?: number;
  verticalPadding?: number;
  tooltipHeightEstimate?: number;
};

type RechartsHoverState = {
  chartX?: number;
  chartY?: number;
  isTooltipActive?: boolean;
  activeTooltipIndex?: number;
  activePayload?: unknown[];
  activeCoordinate?: {
    x?: number;
    y?: number;
  };
};

function resolveTooltipWrapperFromEventTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof SVGElement)) return null;
  const wrapper = target.ownerSVGElement?.closest(".recharts-wrapper");
  return wrapper instanceof HTMLElement ? wrapper : null;
}

function resolvePieEntryName(sector: unknown): string | number | null {
  if (!sector || typeof sector !== "object") return null;

  const candidate = ("name" in sector ? (sector as { name?: unknown }).name : undefined) ??
    (typeof (sector as { payload?: unknown }).payload === "object" &&
    (sector as { payload?: unknown }).payload != null
      ? ((sector as { payload?: { name?: unknown } }).payload?.name ?? undefined)
      : undefined);

  if (typeof candidate === "string" || typeof candidate === "number") return candidate;
  return null;
}

export function useChartCursorTooltip(options: UseChartCursorTooltipOptions = {}) {
  const {
    offsetX = 12,
    offsetY = 12,
    jitterThreshold = 0.5,
    verticalPadding = 8,
    tooltipHeightEstimate = 78,
  } = options;
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>();
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [activePieEntryName, setActivePieEntryName] = useState<string | number | null>(null);
  const tooltipRafIdRef = useRef<number | null>(null);
  const pendingTooltipPositionRef = useRef<TooltipPosition | null>(null);
  const shouldTrackFromContainerRef = useRef(false);

  const flushTooltipPosition = useCallback(() => {
    tooltipRafIdRef.current = null;
    const nextPosition = pendingTooltipPositionRef.current;
    if (!nextPosition) return;

    setTooltipPosition((previousPosition) => {
      if (
        previousPosition &&
        Math.abs(previousPosition.x - nextPosition.x) < jitterThreshold &&
        Math.abs(previousPosition.y - nextPosition.y) < jitterThreshold
      ) {
        return previousPosition;
      }
      return nextPosition;
    });
    setIsTooltipVisible(true);
  }, [jitterThreshold]);

  const queueTooltipPositionFromClientPoint = useCallback(
    (clientX: number, clientY: number, wrapper: HTMLElement) => {
      const bounds = wrapper.getBoundingClientRect();
      const rawY = clientY - bounds.top + offsetY;
      const maxY = Math.max(verticalPadding, bounds.height - tooltipHeightEstimate - verticalPadding);
      pendingTooltipPositionRef.current = {
        x: clientX - bounds.left + offsetX,
        y: Math.max(verticalPadding, Math.min(rawY, maxY)),
      };

      if (tooltipRafIdRef.current === null) {
        tooltipRafIdRef.current = window.requestAnimationFrame(flushTooltipPosition);
      }
    },
    [flushTooltipPosition, offsetX, offsetY, tooltipHeightEstimate, verticalPadding]
  );

  const queueTooltipPosition = useCallback(
    (event?: MouseEvent<SVGGraphicsElement>) => {
      if (!event) return;
      const wrapper = resolveTooltipWrapperFromEventTarget(event.currentTarget);
      if (!wrapper) return;

      queueTooltipPositionFromClientPoint(event.clientX, event.clientY, wrapper);
    },
    [queueTooltipPositionFromClientPoint]
  );

  const queueTooltipPositionFromChart = useCallback(
    (state?: RechartsHoverState) => {
      const coordinateX =
        typeof state?.activeCoordinate?.x === "number"
          ? state.activeCoordinate.x
          : state?.chartX;
      const coordinateY =
        typeof state?.activeCoordinate?.y === "number"
          ? state.activeCoordinate.y
          : state?.chartY;
      const hasTooltipIndex =
        typeof state?.activeTooltipIndex === "number" && state.activeTooltipIndex >= 0;
      const hasPayload = Array.isArray(state?.activePayload) && state.activePayload.length > 0;
      const isActive = state?.isTooltipActive ?? (hasTooltipIndex || hasPayload);

      if (!isActive || typeof coordinateX !== "number" || typeof coordinateY !== "number") {
        pendingTooltipPositionRef.current = null;
        setIsTooltipVisible(false);
        return;
      }

      pendingTooltipPositionRef.current = {
        x: coordinateX + offsetX,
        y: coordinateY + offsetY,
      };

      if (tooltipRafIdRef.current === null) {
        tooltipRafIdRef.current = window.requestAnimationFrame(flushTooltipPosition);
      }
    },
    [flushTooltipPosition, offsetX, offsetY]
  );

  const clearTooltip = useCallback(() => {
    shouldTrackFromContainerRef.current = false;
    setActivePieEntryName(null);
    pendingTooltipPositionRef.current = null;
    if (tooltipRafIdRef.current !== null) {
      window.cancelAnimationFrame(tooltipRafIdRef.current);
      tooltipRafIdRef.current = null;
    }
    setIsTooltipVisible(false);
    setTooltipPosition(undefined);
  }, []);

  useEffect(() => {
    return () => {
      if (tooltipRafIdRef.current !== null) {
        window.cancelAnimationFrame(tooltipRafIdRef.current);
      }
    };
  }, []);

  const queuePieTooltip = useCallback(
    (sector: unknown, event?: MouseEvent<SVGGraphicsElement>) => {
      shouldTrackFromContainerRef.current = true;
      const pieEntryName = resolvePieEntryName(sector);
      if (pieEntryName != null) {
        setActivePieEntryName((previousName) =>
          previousName === pieEntryName ? previousName : pieEntryName
        );
      }
      queueTooltipPosition(event);
    },
    [queueTooltipPosition]
  );

  return {
    pieHandlers: {
      onMouseEnter: (sector: unknown, _index: number, event?: MouseEvent<SVGGraphicsElement>) =>
        queuePieTooltip(sector, event),
      onMouseMove: (sector: unknown, _index: number, event?: MouseEvent<SVGGraphicsElement>) =>
        queuePieTooltip(sector, event),
      onMouseLeave: () => {
        // Keep following through the donut hole; clear on container leave instead.
      },
    },
    chartHandlers: {
      onMouseMove: (state: RechartsHoverState) => {
        queueTooltipPositionFromChart(state);
      },
      onMouseLeave: clearTooltip,
    },
    containerHandlers: {
      onMouseDownCapture: (event: MouseEvent<HTMLElement>) => event.preventDefault(),
      onDragStart: (event: DragEvent<HTMLElement>) => event.preventDefault(),
      onMouseMove: (event: MouseEvent<HTMLElement>) => {
        if (!isTooltipVisible || !shouldTrackFromContainerRef.current) return;
        if (!(event.target instanceof SVGElement)) return;
        const wrapper = event.currentTarget.querySelector(".recharts-wrapper");
        if (!(wrapper instanceof HTMLElement)) return;
        queueTooltipPositionFromClientPoint(event.clientX, event.clientY, wrapper);
      },
      onMouseLeave: clearTooltip,
      onPointerLeave: clearTooltip,
      onBlurCapture: clearTooltip,
    },
    tooltipProps: {
      isAnimationActive: false,
      trigger: "hover" as const,
      cursor: false as const,
      active: isTooltipVisible && Boolean(tooltipPosition),
      ...(tooltipPosition ? { position: tooltipPosition } : {}),
      wrapperStyle: {
        pointerEvents: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        zIndex: 20,
      } as const,
    },
    pieTooltipContentProps: {
      preferredEntryName: activePieEntryName,
      maxItems: 1,
    },
  };
}

export const usePieCursorTooltip = useChartCursorTooltip;
