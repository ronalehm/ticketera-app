"use server";

import { z } from "zod";
import { requirePermission } from "@/modules/auth/server";
import { reviewNoteSchema } from "../schemas/organizer.schema";
import { approveEvent, cancelEvent, rejectEvent, submitForReview } from "../services/eventModeration.service";
import type { EventDraftActionResult } from "../types/organizer.types";
import { EVENT_DRAFT_ERROR_MESSAGES } from "../utils/eventDraftError";
import { invalidInput, toEventActionFailure } from "./eventActionFailure";
import { processEventNotificationsAfterResponse } from "./processEventNotificationsAfterResponse";
import { revalidatePublicEvent } from "./revalidatePublicEvent";

// Acciones de moderación (spec admin-panel, F5b). Enviar a revisión exige `events:manageOwn`; aprobar, rechazar y
// cancelar, `events:moderate` (`requirePermission` redirige sin él). Mismo resultado discriminado que las de borradores.
// Aprobar y cancelar cambian lo que ve el público: invalidan sus páginas (`revalidatePublicEvent`). Enviar a revisión y
// rechazar no tocan nada público.

const eventIdSchema = z.uuid("Evento no válido");

/** Envía a revisión un borrador completo (el dueño aprobado o un admin). */
export async function submitForReviewAction(id: unknown): Promise<EventDraftActionResult> {
  const actor = await requirePermission("events:manageOwn");
  const parsedId = eventIdSchema.safeParse(id);
  if (!parsedId.success) return invalidInput(parsedId.error);
  try {
    await submitForReview(actor, parsedId.data);
    return { ok: true };
  } catch (error) {
    return toEventActionFailure("submitForReviewAction", error);
  }
}

/** Aprueba y publica un evento en revisión (genera su inventario). Si ya no estaba en revisión, lo dice. */
export async function approveEventAction(id: unknown): Promise<EventDraftActionResult> {
  const actor = await requirePermission("events:moderate");
  const parsedId = eventIdSchema.safeParse(id);
  if (!parsedId.success) return invalidInput(parsedId.error);
  try {
    const { status, slug } = await approveEvent(actor, parsedId.data);
    // `published`: aprobado ahora o por un clic anterior (idempotente). Otro estado: alguien lo rechazó o lo canceló.
    if (status === "published") {
      revalidatePublicEvent(slug);
      return { ok: true };
    }
    return { ok: false, error: EVENT_DRAFT_ERROR_MESSAGES.not_pending_review, code: "not_pending_review" };
  } catch (error) {
    return toEventActionFailure("approveEventAction", error);
  }
}

/** Rechaza un evento en revisión con el motivo, que el organizador ve en su borrador. */
export async function rejectEventAction(id: unknown, note: unknown): Promise<EventDraftActionResult> {
  const actor = await requirePermission("events:moderate");
  const parsedId = eventIdSchema.safeParse(id);
  if (!parsedId.success) return invalidInput(parsedId.error);
  const parsedNote = reviewNoteSchema.safeParse(note);
  if (!parsedNote.success) return invalidInput(parsedNote.error);
  try {
    await rejectEvent(actor, parsedId.data, parsedNote.data);
    return { ok: true };
  } catch (error) {
    return toEventActionFailure("rejectEventAction", error);
  }
}

/** Cancela un evento publicado sin ventas y, tras responder, envía el aviso a los compradores si se encoló. */
export async function cancelEventAction(id: unknown): Promise<EventDraftActionResult> {
  const actor = await requirePermission("events:moderate");
  const parsedId = eventIdSchema.safeParse(id);
  if (!parsedId.success) return invalidInput(parsedId.error);
  try {
    const { slug, notification } = await cancelEvent(actor, parsedId.data);
    revalidatePublicEvent(slug);
    processEventNotificationsAfterResponse(notification);
    return { ok: true };
  } catch (error) {
    return toEventActionFailure("cancelEventAction", error);
  }
}
