import "server-only";

import { and, count, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { insertEventInventory } from "@/lib/db/eventInventory";
import { eventSeats, events, ticketTypes } from "@/lib/db/schema/events";
import { venueSections, venues } from "@/lib/db/schema/venues";
import { roleCan } from "@/modules/auth/permissions";
import { getOrganizerStatus } from "@/modules/auth/server";
import type { ManagedEventStatus } from "@/modules/events";
import { EventDraftError } from "../utils/eventDraftError";
import { canTransition } from "../utils/eventTransitions";
import { getPublishIssues } from "../utils/publishRequirements";
import {
  type Actor,
  assertActorCanMutate,
  type Database,
  hasActiveSales,
  type LockedEvent,
  lockManagedEvent,
  sectionCapacity,
  type Tx,
} from "./eventDrafts.service";

// Moderación de eventos (spec admin-panel, F5b): enviar a revisión, aprobar (con inventario), rechazar y cancelar. Las
// transiciones y el permiso que exige cada una salen de `EVENT_TRANSITIONS`; aquí se comprueba lo que depende de la BD.
// Autorizar la acción es tarea de quien llama (`requirePermission`); cada operación bloquea el evento (`FOR UPDATE`) en
// su transacción, así que dos clics o dos moderadores a la vez se serializan.

/** Exige `events:moderate` antes de abrir la transacción. */
function assertModerator(actor: Actor): void {
  if (!roleCan(actor.role, "events:moderate")) throw new EventDraftError("not_moderator");
}

/**
 * Requisitos para publicar (requisito 4): campos del CHECK, al menos un tipo de entrada, cada uno con algún lugar que
 * vender (su sección tiene capacidad) y fecha futura.
 */
async function assertPublishable(event: LockedEvent, tx: Tx, now: Date): Promise<void> {
  const [{ ticketTypeCount, emptyTicketTypeCount }] = await tx
    .select({
      ticketTypeCount: count(),
      emptyTicketTypeCount: sql<number>`count(*) filter (where coalesce(${sectionCapacity}, 0) = 0)`.mapWith(Number),
    })
    .from(ticketTypes)
    .innerJoin(venueSections, eq(venueSections.id, ticketTypes.sectionId))
    .where(eq(ticketTypes.eventId, event.id));
  const issues = getPublishIssues({ ...event, ticketTypeCount, emptyTicketTypeCount }, now);
  if (issues.length > 0) throw new EventDraftError("incomplete", issues);
}

/**
 * Al aprobar, el organizador dueño y el recinto tienen que seguir `approved`: pudieron suspenderse o retirarse mientras
 * el evento esperaba en revisión.
 */
async function assertOwnerAndVenueApproved(event: LockedEvent, tx: Tx): Promise<void> {
  if ((await getOrganizerStatus(event.organizerId, tx)) !== "approved") throw new EventDraftError("owner_not_approved");
  const [venue] = event.venueId
    ? await tx.select({ status: venues.status }).from(venues).where(eq(venues.id, event.venueId))
    : [];
  if (venue?.status !== "approved") throw new EventDraftError("event_venue_not_approved");
}

/**
 * Envía a revisión (`draft → pending_review`): el organizador dueño aprobado o un admin, con los requisitos para publicar
 * cumplidos. Repetirlo sobre un evento que ya está en revisión no hace nada.
 */
export async function submitForReview(
  actor: Actor,
  eventId: string,
  database: Database = db,
  now: Date = new Date(),
): Promise<void> {
  await database.transaction(async (tx) => {
    await assertActorCanMutate(actor, tx);
    const event = await lockManagedEvent(actor, eventId, tx);
    if (event.status === "pending_review") return;
    if (!canTransition(actor.role, event.status, "submit")) throw new EventDraftError("submit_not_draft");
    await assertPublishable(event, tx, now);
    await tx.update(events).set({ status: "pending_review" }).where(eq(events.id, eventId));
  });
}

/**
 * Aprueba y publica (`pending_review → published`) en una sola transacción: bloquea el evento; si ya no está en revisión
 * no hace nada (un segundo clic espera el lock y encuentra `published`); revalida los requisitos para publicar y que el
 * organizador y el recinto sigan aprobados; comprueba que no hay inventario activo; genera todo el inventario
 * (`insertEventInventory`) y marca `published` con quién y cuándo lo revisó. Cualquier fallo revierte todo. Devuelve el
 * estado en que queda el evento y su slug (la acción invalida sus páginas públicas).
 */
export async function approveEvent(
  actor: Actor,
  eventId: string,
  database: Database = db,
  now: Date = new Date(),
): Promise<{ status: ManagedEventStatus; slug: string }> {
  assertModerator(actor);
  return database.transaction(async (tx) => {
    const event = await lockManagedEvent(actor, eventId, tx);
    if (!canTransition(actor.role, event.status, "approve")) return { status: event.status, slug: event.slug };
    await assertPublishable(event, tx, now);
    await assertOwnerAndVenueApproved(event, tx);

    const [activeSeat] = await tx
      .select({ id: eventSeats.id })
      .from(eventSeats)
      .where(and(eq(eventSeats.eventId, eventId), isNull(eventSeats.retiredAt)))
      .limit(1);
    if (activeSeat) throw new EventDraftError("inventory_exists");
    await insertEventInventory(tx, eventId);

    await tx
      .update(events)
      .set({ status: "published", reviewedBy: actor.id, reviewedAt: sql`now()`, reviewNote: null })
      .where(eq(events.id, eventId));
    return { status: "published" as const, slug: event.slug };
  });
}

/** Rechaza (`pending_review → draft`) con el motivo (`review_note`), que el organizador ve en su borrador. */
export async function rejectEvent(actor: Actor, eventId: string, note: string, database: Database = db): Promise<void> {
  assertModerator(actor);
  const reviewNote = note.trim();
  if (!reviewNote) throw new EventDraftError("review_note_required");
  await database.transaction(async (tx) => {
    const event = await lockManagedEvent(actor, eventId, tx);
    if (!canTransition(actor.role, event.status, "reject")) throw new EventDraftError("not_pending_review");
    await tx
      .update(events)
      .set({ status: "draft", reviewNote, reviewedBy: actor.id, reviewedAt: sql`now()` })
      .where(eq(events.id, eventId));
  });
}

/**
 * Cancela un evento publicado (`published → cancelled`, terminal), solo sin ventas activas (Decisión 12: "Cancelación
 * con reembolsos: Próximamente"). Repetirlo sobre un evento ya cancelado no hace nada. El inventario se conserva
 * (historial); el catálogo solo muestra eventos `published`. El `FOR UPDATE` del evento se serializa con la reserva del
 * checkout (`FOR SHARE` del evento publicado): una reserva en curso termina antes y cuenta como venta, y una posterior ya
 * encuentra el evento cancelado. Devuelve su slug (la acción invalida sus páginas públicas).
 */
export async function cancelEvent(actor: Actor, eventId: string, database: Database = db): Promise<{ slug: string }> {
  assertModerator(actor);
  return database.transaction(async (tx) => {
    const event = await lockManagedEvent(actor, eventId, tx);
    if (event.status === "cancelled") return { slug: event.slug };
    if (!canTransition(actor.role, event.status, "cancel")) throw new EventDraftError("cancel_not_published");
    if (await hasActiveSales(eventId, tx)) throw new EventDraftError("has_sales");
    await tx.update(events).set({ status: "cancelled", cancelledAt: sql`now()` }).where(eq(events.id, eventId));
    return { slug: event.slug };
  });
}
