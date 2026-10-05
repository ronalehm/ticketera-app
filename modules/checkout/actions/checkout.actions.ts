"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/modules/auth/server";
import { getCheckoutOrder } from "../services/checkout.service";
import { releaseOrder, reserveCheckoutOrder } from "../services/reservation.service";

/** Estado de `useActionState` del botón "Continuar": `null` al inicio; si la reserva falla, el mensaje. */
export type StartCheckoutState = { error: string } | null;

const CHECKOUT_COOKIE = "mentec_checkout";
const SELECTION_PREFIX = "/checkout?";
const UNAVAILABLE = { error: "Esos asientos ya no están disponibles. Elige otros para continuar." };
const GENERIC_ERROR = { error: "No pudimos reservar tus entradas. Inténtalo de nuevo." };

/**
 * "Continuar": libera la reserva previa de este navegador (cookie), valida la selección (`checkoutHref`, contrato C),
 * reserva los asientos en la BD y redirige a `/checkout?orden=<uuid>`.
 */
export async function startCheckout(_prev: StartCheckoutState, formData: FormData): Promise<StartCheckoutState> {
  const selection = formData.get("selection");
  if (typeof selection !== "string" || selection.length > 2000 || !selection.startsWith(SELECTION_PREFIX)) {
    return UNAVAILABLE;
  }

  let orderId: string;
  try {
    const cookieStore = await cookies();
    const previous = z.uuid().safeParse(cookieStore.get(CHECKOUT_COOKIE)?.value);
    if (previous.success) await releaseOrder(previous.data);

    const checkout = await getCheckoutOrder(parseSelection(selection.slice(SELECTION_PREFIX.length)));
    if (checkout.status === "sold-out" || checkout.status === "invalid-tickets") return UNAVAILABLE;
    if (checkout.status !== "ok") return GENERIC_ERROR;

    const reservation = await reserveCheckoutOrder(checkout.order, await getSessionUserId());
    if (reservation.status !== "reserved") return UNAVAILABLE;
    orderId = reservation.orderId;

    cookieStore.set(CHECKOUT_COOKIE, orderId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
  } catch (error) {
    // Sin `message` ni `params`: un error de BD los trae con los datos del pedido.
    console.error("startCheckout", describeError(error));
    return GENERIC_ERROR;
  }
  // Fuera del try: `redirect` lanza para cortar la acción.
  redirect(`/checkout?orden=${orderId}`);
}

/** Query de `selection` → params de `getCheckoutOrder` (claves repetidas → array). */
function parseSelection(query: string): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  for (const [key, value] of new URLSearchParams(query)) {
    const current = params[key];
    params[key] = current === undefined ? value : [current, value].flat();
  }
  return params;
}

/** Comprar como invitado si no hay sesión o si falla la consulta. */
async function getSessionUserId(): Promise<string | null> {
  try {
    return (await getSessionUser())?.id ?? null;
  } catch {
    return null;
  }
}

function describeError(error: unknown) {
  if (!(error instanceof Error)) return { name: typeof error };
  return { name: error.name, code: (error.cause as { code?: unknown } | undefined)?.code };
}
