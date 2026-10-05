"use server";

import { isIP } from "node:net";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { describeError } from "@/lib/describeError";
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
