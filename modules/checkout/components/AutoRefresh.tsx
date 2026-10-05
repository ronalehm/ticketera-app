"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const REFRESH_INTERVAL_MS = 3000;

/**
 * Vuelve a pedir la página al servidor cada 3 s mientras el pago está en proceso (hasta que llegue el webhook).
 * Con la pestaña oculta no refresca.
 */
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    // ponytail: sin límite de intentos (solo se pausa con la pestaña oculta); añadir un tope si una orden se queda
    // `processing` horas.
    const id = setInterval(() => {
      if (document.visibilityState !== "hidden") router.refresh();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
