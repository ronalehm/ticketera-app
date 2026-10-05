"use server";

import { z } from "zod";
import { roleCan } from "@/modules/auth/permissions";
import { requirePermission, type SessionUser } from "@/modules/auth/server";
import { createEventDraftSchema } from "../schemas/organizer.schema";
import { createEvent, deleteEvent, updateEvent } from "../services/eventDrafts.service";
import type { EventDraftActionFailure, EventDraftActionResult, EventDraftInput } from "../types/organizer.types";
import { toEventDraftInput } from "../utils/organizerEventForm";
import { invalidInput as invalid, toEventActionFailure as failure } from "./eventActionFailure";
import { revalidatePublicEvent } from "./revalidatePublicEvent";

// Acciones del CRUD de borradores (spec admin-panel, F5a). Todas exigen `events:manageOwn` (`requirePermission`
// redirige sin él) y devuelven un resultado discriminado: `{ ok: true, ... }` o `{ ok: false, error, code? }`, con
// `error` en español. El dueño, el estado del organizador y el alcance los comprueba el servicio.

const eventIdSchema = z.uuid("Evento no válido");

/** Valida el formulario para `actor`: admin y super_admin tienen que elegir el organizador dueño. */
function parseDraft(actor: SessionUser, input: unknown): { ok: true; data: EventDraftInput } | EventDraftActionFailure {
  const requireOrganizer = roleCan(actor.role, "events:manageAny");
  const parsed = createEventDraftSchema({ requireOrganizer }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return { ok: true, data: toEventDraftInput(parsed.data, { requireOrganizer }) };
}

/** Crea un borrador con los valores del formulario. */
export async function createEventAction(input: unknown): Promise<EventDraftActionResult<{ id: string }>> {
  const actor = await requirePermission("events:manageOwn");
  const draft = parseDraft(actor, input);
  if (!draft.ok) return draft;
  try {
    const { id } = await createEvent(actor, draft.data);
    return { ok: true, id };
  } catch (error) {
    return failure("createEventAction", error);
  }
}

/**
 * Guarda los cambios de un evento: libre en borrador, limitada si está publicado (y entonces invalida sus páginas
 * públicas); en revisión, cancelado o finalizado no se edita.
 */
export async function updateEventAction(id: unknown, input: unknown): Promise<EventDraftActionResult> {
  const actor = await requirePermission("events:manageOwn");
  const parsedId = eventIdSchema.safeParse(id);
  if (!parsedId.success) return invalid(parsedId.error);
  const draft = parseDraft(actor, input);
  if (!draft.ok) return draft;
  try {
    const { status, slug } = await updateEvent(actor, parsedId.data, draft.data);
    if (status === "published") revalidatePublicEvent(slug);
    return { ok: true };
  } catch (error) {
    return failure("updateEventAction", error);
  }
}

/** Elimina un borrador sin órdenes ni inventario. */
export async function deleteEventAction(id: unknown): Promise<EventDraftActionResult> {
  const actor = await requirePermission("events:manageOwn");
  const parsedId = eventIdSchema.safeParse(id);
  if (!parsedId.success) return invalid(parsedId.error);
  try {
    await deleteEvent(actor, parsedId.data);
    return { ok: true };
  } catch (error) {
    return failure("deleteEventAction", error);
  }
}
