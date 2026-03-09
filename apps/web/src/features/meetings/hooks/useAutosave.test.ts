import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";
import { useAutosave } from "./useAutosave";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAutosave", () => {
  it("starts with idle status", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave("hello", { onSave }));
    expect(result.current.status).toBe("idle");
  });

  it("does not save when value has not changed", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useAutosave("hello", { onSave }));
    vi.advanceTimersByTime(2000);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves after delay when value changes", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ value }) => useAutosave(value, { onSave }),
      { initialProps: { value: "hello" } },
    );

    rerender({ value: "hello world" });
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(onSave).toHaveBeenCalledWith("hello world");
    expect(result.current.status).toBe("saved");
  });

  it("uses custom delay", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ value }) => useAutosave(value, { onSave, delay: 500 }),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });

    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(onSave).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(onSave).toHaveBeenCalledWith("ab");
  });

  it("only saves the latest value when typing fast", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ value }) => useAutosave(value, { onSave, delay: 1000 }),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });
    vi.advanceTimersByTime(500);
    rerender({ value: "abc" });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith("abc");
  });

  it("shows error when save fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("fail"));
    const { result, rerender } = renderHook(
      ({ value }) => useAutosave(value, { onSave }),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });

    await act(async () => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.status).toBe("error");
  });

  it("saveNow saves without waiting", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ value }) => useAutosave(value, { onSave }),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });

    await act(async () => {
      await result.current.saveNow();
    });

    expect(onSave).toHaveBeenCalledWith("ab");
    expect(result.current.status).toBe("saved");
  });

  it("saveNow does nothing when value has not changed", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave("hello", { onSave }));

    await act(async () => {
      await result.current.saveNow();
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it("saveNow sets error status on failure", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("fail"));
    const { result, rerender } = renderHook(
      ({ value }) => useAutosave(value, { onSave }),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });

    await act(async () => {
      await result.current.saveNow();
    });

    expect(result.current.status).toBe("error");
  });

  it("saveNow stops the timer and saves right away", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ value }) => useAutosave(value, { onSave, delay: 1000 }),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });

    await act(async () => {
      await result.current.saveNow();
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
