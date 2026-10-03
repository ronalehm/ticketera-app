"use client";

import { useEffect, useEffectEvent } from "react";
import Link from "next/link";
import { Clock, TimerOff } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCountdown } from "../hooks/useCountdown";

const RESERVATION_DURATION_MS = 600_000;

type ReservationTimerProps = {
  eventSlug: string;
  onExpire?: () => void;
};

export function ReservationTimer({ eventSlug, onExpire }: ReservationTimerProps) {
  const { label, minutesLeft, isExpired } = useCountdown(RESERVATION_DURATION_MS);
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
            href={`/eventos/${eventSlug}`}
            className={cn(
              buttonVariants({ size: "lg" }),
              "col-start-2 mt-3 h-11 w-fit cursor-pointer px-6 font-semibold duration-200 hover:bg-primary-strong",
            )}
          >
            Volver a elegir entradas
          </Link>
        </Alert>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3 text-base">
          <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p>
            Tiempo para completar tu compra: <strong className="font-bold tabular-nums">{label}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
