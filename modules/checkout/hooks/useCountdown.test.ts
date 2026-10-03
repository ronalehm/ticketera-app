import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "./useCountdown";

const TEN_MINUTES = 600_000;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useCountdown", () => {
  it("empieza en 10:00 con 10 minutos restantes", () => {
    const { result } = renderHook(() => useCountdown(TEN_MINUTES));
    expect(result.current).toEqual({ remainingMs: TEN_MINUTES, label: "10:00", minutesLeft: 10, isExpired: false });
  });

  it("baja cada segundo con formato mm:ss", () => {
    const { result } = renderHook(() => useCountdown(TEN_MINUTES));
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.label).toBe("09:59");
    expect(result.current.minutesLeft).toBe(10);
  });

  it("cambia de minuto a los 60 s", () => {
    const { result } = renderHook(() => useCountdown(TEN_MINUTES));
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.label).toBe("09:00");
    expect(result.current.minutesLeft).toBe(9);
  });

  it("expira a los 600 s y detiene el intervalo", () => {
    const { result } = renderHook(() => useCountdown(TEN_MINUTES));
    act(() => vi.advanceTimersByTime(TEN_MINUTES));
    expect(result.current).toEqual({ remainingMs: 0, label: "00:00", minutesLeft: 0, isExpired: true });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("limpia el intervalo al desmontar", () => {
    const { unmount } = renderHook(() => useCountdown(TEN_MINUTES));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
