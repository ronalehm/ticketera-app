"use server";

import { describeError } from "@/lib/describeError";
import { syncClerkRole } from "../services/session.service";

/**
 * Sincroniza el rol de la sesión de la BD a Clerk (`publicMetadata.role`). Sin parámetros: el rol sale siempre de la
 * BD y el cliente no puede elegir el suyo. Best effort: ante un error lo registra y devuelve `changed: false`.
 */
export async function syncSessionRoleAction(): Promise<{ changed: boolean }> {
  try {
    return await syncClerkRole();
  } catch (error) {
    console.error("syncSessionRoleAction", describeError(error));
    return { changed: false };
  }
}
