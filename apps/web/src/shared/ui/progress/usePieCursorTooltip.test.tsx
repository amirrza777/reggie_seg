import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChartCursorTooltip, usePieCursorTooltip } from "./usePieCursorTooltip";

let rafQueue: FrameRequestCallback[] = [];
let cancelAnimationFrameMock = vi.fn();

function flushRafQueue() {
  const callbacks = [...rafQueue];
  rafQueue = [];
  for (const callback of callbacks) {
    callback(0);
  }
}

function createChartDom() {
  const container = document.createElement("div");
  const wrapper = document.createElement("div");
  wrapper.className = "recharts-wrapper";
  Object.defineProperty(wrapper, "getBoundingClientRect", {
    value: () =>
      ({
        x: 10,
        y: 20,
        left: 10,
        top: 20,
        right: 310,
        bottom: 220,
        width: 300,
        height: 200,
        toJSON: () => ({}),
      }) as DOMRect,
  });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const sector = document.createElementNS("http://www.w3.org/2000/svg", "path");
  svg.appendChild(sector);
  wrapper.appendChild(svg);
  container.appendChild(wrapper);
  document.body.appendChild(container);
  return { container, wrapper, svg, sector };
}

describe("usePieCursorTooltip", () => {
  beforeEach(() => {
    rafQueue = [];
    cancelAnimationFrameMock = vi.fn();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      rafQueue.push(callback);
      return rafQueue.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      cancelAnimationFrameMock(id);
      return undefined;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("activates and clears tooltip state from chart hover handlers", () => {
    const { result } = renderHook(() => useChartCursorTooltip({ jitterThreshold: 1 }));

    expect(result.current.tooltipProps.active).toBe(false);

    act(() => {
      result.current.chartHandlers.onMouseMove({
        activeTooltipIndex: 0,
        chartX: 12,
        chartY: 24,
      });
      flushRafQueue();
    });
    expect(result.current.tooltipProps.active).toBe(true);
    expect(result.current.tooltipProps.position).toEqual({ x: 24, y: 36 });

    const firstPosition = result.current.tooltipProps.position;
    act(() => {
      result.current.chartHandlers.onMouseMove({
        activeTooltipIndex: 0,
        chartX: 12.2,
        chartY: 24.2,
      });
      flushRafQueue();
    });
    expect(result.current.tooltipProps.position).toBe(firstPosition);

    act(() => {
      result.current.chartHandlers.onMouseMove({
        isTooltipActive: false,
        chartX: 40,
        chartY: 50,
      });
    });
    expect(result.current.tooltipProps.active).toBe(false);

    act(() => {
      result.current.chartHandlers.onMouseLeave();
    });
    expect(result.current.tooltipProps.active).toBe(false);
    expect(result.current.tooltipProps.position).toBeUndefined();
  });

  it("tracks pie tooltip names and repositions from container mouse movement", () => {
    const { container, sector } = createChartDom();
    const { result } = renderHook(() =>
      usePieCursorTooltip({ offsetX: 10, offsetY: 10, verticalPadding: 8, tooltipHeightEstimate: 78 }),
    );

    act(() => {
      result.current.pieHandlers.onMouseEnter(
        { payload: { name: "Payload Label" } },
        0,
        { currentTarget: sector, clientX: 70, clientY: 80 } as never,
      );
      flushRafQueue();
    });
    expect(result.current.tooltipProps.active).toBe(true);
    expect(result.current.tooltipProps.position).toEqual({ x: 70, y: 70 });
    expect(result.current.pieTooltipContentProps.preferredEntryName).toBe("Payload Label");

    act(() => {
      result.current.containerHandlers.onMouseMove({
        currentTarget: container,
        target: sector,
        clientX: 360,
        clientY: 500,
      } as never);
      flushRafQueue();
    });
    expect(result.current.tooltipProps.position).toEqual({ x: 360, y: 114 });

    act(() => {
      result.current.containerHandlers.onMouseLeave();
    });
    expect(result.current.tooltipProps.active).toBe(false);
    expect(result.current.pieTooltipContentProps.preferredEntryName).toBeNull();
  });

  it("covers pie move/leave handlers and duplicate entry names", () => {
    const { sector } = createChartDom();
    const { result } = renderHook(() => useChartCursorTooltip());

    act(() => {
      result.current.pieHandlers.onMouseEnter(
        { name: "Repeated" },
        0,
        { currentTarget: sector, clientX: 80, clientY: 90 } as never,
      );
      flushRafQueue();
    });
    expect(result.current.pieTooltipContentProps.preferredEntryName).toBe("Repeated");

    act(() => {
      result.current.pieHandlers.onMouseMove(
        { name: "Repeated" },
        0,
        { currentTarget: sector, clientX: 100, clientY: 110 } as never,
      );
      flushRafQueue();
      result.current.pieHandlers.onMouseLeave();
    });
    expect(result.current.pieTooltipContentProps.preferredEntryName).toBe("Repeated");
  });

  it("handles chart states without coordinates and activeCoordinate fallback", () => {
    const { result } = renderHook(() => useChartCursorTooltip());

    act(() => {
      result.current.chartHandlers.onMouseMove({
        activePayload: [{}],
        chartY: 22,
      });
    });
    expect(result.current.tooltipProps.active).toBe(false);

    act(() => {
      result.current.chartHandlers.onMouseMove({
        activePayload: [{}],
        activeCoordinate: { x: 6, y: 7 },
      });
      flushRafQueue();
    });
    expect(result.current.tooltipProps.position).toEqual({ x: 18, y: 19 });
    expect(result.current.tooltipProps.active).toBe(true);

    act(() => {
      result.current.chartHandlers.onMouseMove({
        activeTooltipIndex: -1,
        activePayload: [],
        chartX: 12,
        chartY: 14,
      });
    });
    expect(result.current.tooltipProps.active).toBe(false);
  });

  it("handles missing wrappers and non-svg targets without crashing", () => {
    const plainDiv = document.createElement("div");
    const detachedSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const detachedSector = document.createElementNS("http://www.w3.org/2000/svg", "path");
    detachedSvg.appendChild(detachedSector);
    const containerWithoutWrapper = document.createElement("div");
    containerWithoutWrapper.appendChild(detachedSvg);

    const { result } = renderHook(() => useChartCursorTooltip());

    act(() => {
      result.current.containerHandlers.onMouseMove({
        currentTarget: containerWithoutWrapper,
        target: detachedSector,
        clientX: 20,
        clientY: 20,
      } as never);
    });

    act(() => {
      result.current.pieHandlers.onMouseEnter(
        { name: "Detached" },
        0,
        { currentTarget: plainDiv, clientX: 5, clientY: 5 } as never,
      );
      result.current.pieHandlers.onMouseEnter(
        { payload: { name: { invalid: true } } },
        0,
        { currentTarget: detachedSector, clientX: 5, clientY: 5 } as never,
      );
      result.current.pieHandlers.onMouseEnter(
        { payload: "not-an-object" },
        0,
        { currentTarget: detachedSector, clientX: 6, clientY: 6 } as never,
      );
    });
    expect(result.current.pieTooltipContentProps.preferredEntryName).toBe("Detached");
    expect(result.current.tooltipProps.active).toBe(false);

    act(() => {
      result.current.containerHandlers.onMouseMove({
        currentTarget: containerWithoutWrapper,
        target: plainDiv,
        clientX: 40,
        clientY: 40,
      } as never);
    });

    const preventDefault = vi.fn();
    act(() => {
      result.current.containerHandlers.onMouseDownCapture({ preventDefault } as never);
      result.current.containerHandlers.onDragStart({ preventDefault } as never);
    });
    expect(preventDefault).toHaveBeenCalledTimes(2);

    act(() => {
      result.current.containerHandlers.onPointerLeave();
      result.current.containerHandlers.onBlurCapture();
    });
    expect(result.current.tooltipProps.active).toBe(false);
  });

  it("cancels queued animation frames on clear and unmount", () => {
    const { sector } = createChartDom();
    const { result, unmount } = renderHook(() => useChartCursorTooltip());

    act(() => {
      result.current.pieHandlers.onMouseEnter(
        { name: "Queued" },
        0,
        { currentTarget: sector, clientX: 30, clientY: 40 } as never,
      );
    });
    expect(rafQueue.length).toBeGreaterThan(0);

    act(() => {
      result.current.containerHandlers.onMouseLeave();
    });
    expect(cancelAnimationFrameMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.pieHandlers.onMouseEnter(
        { name: "Queued" },
        0,
        { currentTarget: sector, clientX: 31, clientY: 41 } as never,
      );
    });
    expect(rafQueue.length).toBeGreaterThan(0);

    unmount();
    expect(cancelAnimationFrameMock).toHaveBeenCalledTimes(2);
  });
});
