"use client";

import { useEffect, useState } from "react";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function useCountdown(durationMs: number) {
  // El primer render muestra la duración completa: sin desajuste de hidratación.
  const [remainingMs, setRemainingMs] = useState(durationMs);

  useEffect(() => {
    // Plazo fijo con Date.now(): resistente a pestañas en segundo plano (intervalos ralentizados).
    const deadline = Date.now() + durationMs;
    const id = setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      setRemainingMs(left);
      if (left === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [durationMs]);

  const totalSeconds = Math.ceil(remainingMs / 1000);

  return {
    remainingMs,
    label: `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`,
    minutesLeft: Math.ceil(remainingMs / 60_000),
    isExpired: remainingMs === 0,
  };
}
