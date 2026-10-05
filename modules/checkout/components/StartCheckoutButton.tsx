"use client";

import { type ReactNode, useActionState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { startCheckout } from "../actions/checkout.actions";

type StartCheckoutButtonProps = {
  /** Selección del comprador (contrato C); `null` sin entradas elegidas → botón deshabilitado. */
  checkoutHref: string | null;
  className?: string;
  children: ReactNode;
};

/** CTA "Continuar": reserva los asientos en la BD (`startCheckout`) y lleva a `/checkout?orden=<uuid>`. */
export function StartCheckoutButton({ checkoutHref, className, children }: StartCheckoutButtonProps) {
  const [state, formAction, pending] = useActionState(startCheckout, null);

  if (checkoutHref === null) {
    return (
      <button type="button" disabled className={className}>
        {children}
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="selection" value={checkoutHref} />
      <button type="submit" disabled={pending} aria-busy={pending} className={className}>
        {pending ? (
          <>
            <Spinner aria-hidden className="motion-reduce:animate-none" />
            Reservando…
          </>
        ) : (
          children
        )}
      </button>
      {state && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
