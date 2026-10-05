"use client";

import { useEffect, useEffectEvent } from "react";
import Link from "next/link";
import { Clock, TimerOff } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCountdown } from "../hooks/useCountdown";

type ReservationTimerProps = {
  /** Tiempo restante de la reserva al montar (`expires_at − now()` con el reloj de la BD). */
  durationMs: number;
  retryHref: string;
  onExpire?: () => void;
};

export function ReservationTimer({ durationMs, retryHref, onExpire }: ReservationTimerProps) {
  const { label, minutesLeft, isExpired } = useCountdown(durationMs);
  const handleExpire = useEffectEvent(() => onExpire?.());

  // isExpired solo pasa de false a true una vez: onExpire se llama una sola vez.
  useEffect(() => {
    if (isExpired) handleExpire();
  }, [isExpired]);

  return (
    <div>
      {/* Solo cambia al cambiar el minuto: no anuncia cada segundo. */}
      <p className="sr-only" aria-live="polite">
        {isExpired ? "" : `Te quedan ${minutesLeft} ${minutesLeft === 1 ? "minuto" : "minutos"}`}
      </p>
      {isExpired ? (
        <Alert variant="destructive" className="px-4 py-3">
          <TimerOff aria-hidden="true" />
          <AlertTitle className="font-bold">Tu reserva expiró</AlertTitle>
          <AlertDescription>
            El tiempo para completar la compra terminó. Vuelve a elegir tus entradas para intentarlo de nuevo.
          </AlertDescription>
          <Link
            href={retryHref}
            className={cn(
              buttonVariants({ size: "lg" }),
              "col-start-2 mt-3 h-11 w-fit cursor-pointer px-6 font-semibold duration-200 hover:bg-primary-strong",
            )}
          >
            Volver a elegir entradas
          </Link>
        </Alert>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-base">
          <Clock className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            Reservamos tus entradas por <strong className="font-bold tabular-nums">{label}</strong>. Completa el pago
            antes de que se liberen.
          </p>
        </div>
      )}
    </div>
  );
}
