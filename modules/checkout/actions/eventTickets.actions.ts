"use server";

import { z } from "zod";
import { getSessionUser, getVerifiedEmail } from "@/modules/auth/server";
import { hasPaidTicketsForEvent } from "../services/orders.service";

const slugSchema = z.string().min(1).max(200);

/**
 * Para la barra de acciones del detalle público (página estática): `true` si quien navega tiene entradas pagadas del
 * evento. Sin sesión o ante cualquier error, `false`: decide qué botón es el principal, no es un flujo crítico.
 */
export async function hasTicketsForEvent(slug: unknown): Promise<boolean> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return false;
  try {
    const user = await getSessionUser();
    if (!user) return false;
    return await hasPaidTicketsForEvent(
      parsed.data,
      user.id,
      await getVerifiedEmail(),
    );
  } catch {
    return false;
  }
}
