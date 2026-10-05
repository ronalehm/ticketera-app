"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 3000;

/** Vuelve a pedir la página al servidor cada 3 s mientras el pago está en proceso (hasta que llegue el webhook). */
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    // ponytail: sin límite de intentos; añadir un tope si una orden se queda `processing` horas.
    const id = setInterval(() => router.refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
