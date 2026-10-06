"use server";

import { requirePermission } from "@/modules/auth/server";
import type { ManagedEvent } from "@/modules/events";
import { listManagedEvents, managedEventsFiltersSchema } from "@/modules/events/server";

/**
 * Eventos que gestiona el usuario de la sesión (los suyos o, si es admin, todos), filtrados. Sin `events:manageOwn`
 * redirige (`requirePermission`); unos filtros no válidos lanzan `ZodError` (la query de TanStack queda en error).
 */
export async function listManagedEventsAction(input: unknown): Promise<ManagedEvent[]> {
  const user = await requirePermission("events:manageOwn");
  const filters = managedEventsFiltersSchema.parse(input);
  return listManagedEvents(user, filters);
}
