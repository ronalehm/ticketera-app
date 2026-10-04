"use server";

import { isIP } from "node:net";
import { DrizzleQueryError } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { completeProfileSchema } from "../schemas/auth.schema";
import { getSessionUser } from "../services/session.service";
import { completeProfile } from "../services/users.service";
import { can } from "../utils/can";
import { getSafeRedirect } from "../utils/getSafeRedirect";

/** "Completa tu perfil": guarda celular, documento y consentimientos y redirige a `redirectUrl` (saneada). */
export async function completeProfileAction(input: unknown, redirectUrl: unknown): Promise<{ error: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Inicia sesión para continuar" };
  if (!can(user, "profile:update")) return { error: "No tienes permiso para esta acción" };

  const parsed = completeProfileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
  try {
    await completeProfile(user.id, parsed.data, {
      ip: isIP(ip) ? ip : null,
      userAgent: requestHeaders.get("user-agent"),
    });
  } catch (error) {
    console.error("completeProfileAction", describeError(error));
    return { error: "No pudimos completar la solicitud. Inténtalo de nuevo." };
  }
  redirect(getSafeRedirect(typeof redirectUrl === "string" ? redirectUrl : null));
}

/**
 * Datos del error sin información personal: de un error de BD solo el nombre y el SQLSTATE (`query`, `params` y el
 * `message` llevan los valores del usuario); de un error propio de la app, su mensaje.
 */
function describeError(error: unknown) {
  // `DrizzleQueryError` no fija `name` (queda "Error"), por eso va literal.
  if (error instanceof DrizzleQueryError) {
    return { name: "DrizzleQueryError", code: (error.cause as { code?: unknown } | undefined)?.code };
  }
  return error instanceof Error ? { name: error.name, message: error.message } : { name: typeof error };
}
