import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { events } from "@/lib/db/schema/events";
import { roleCan } from "@/modules/auth/permissions";
import type { ManagedEventStatus } from "@/modules/events";
import { EventDraftError } from "../utils/eventDraftError";
import type { Actor, Database } from "./eventDrafts.service";

/**
 * Marca o quita un evento de destacados (spec events-dynamic-landing, Decisión 10). Solo `events:manageAny` (admin,
 * super_admin); en cualquier estado: la landing solo muestra los publicados futuros. Devuelve su slug y estado (la acción
 * invalida sus páginas públicas si está publicado).
 */
export async function setEventFeatured(
  actor: Actor,
  eventId: string,
  featured: boolean,
  database: Database = db,
): Promise<{ slug: string; status: ManagedEventStatus }> {
  if (!roleCan(actor.role, "events:manageAny")) throw new EventDraftError("feature_not_allowed");
  const [event] = await database
    .update(events)
    .set({ featured, updatedAt: sql`now()` })
    .where(eq(events.id, eventId))
    .returning({ slug: events.slug, status: events.status });
  if (!event) throw new EventDraftError("not_found");
  return event;
}
