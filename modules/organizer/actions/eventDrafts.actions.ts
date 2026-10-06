"use server";

import { after } from "next/server";
import { z } from "zod";
import { can, roleCan } from "@/modules/auth/permissions";
import { getSessionUser, requirePermission, type SessionUser } from "@/modules/auth/server";
import { createEventDraftSchema } from "../schemas/organizer.schema";
import { deleteOwnCoverBestEffort } from "../services/eventCoverCleanup.service";
import { createEvent, deleteEvent, getEventForEdit, updateEvent } from "../services/eventDrafts.service";
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
 * Guarda los cambios de un evento: libre en borrador, con los requisitos de revisión si está en revisión, sin tocar su
 * estructura si está publicado (y entonces invalida sus páginas públicas); cancelado o finalizado no se edita. Si la portada cambió, borra la anterior (si era nuestra)
 * después de guardar y de responder.
 */
export async function updateEventAction(id: unknown, input: unknown): Promise<EventDraftActionResult> {
  const actor = await requirePermission("events:manageOwn");
  const parsedId = eventIdSchema.safeParse(id);
  if (!parsedId.success) return invalid(parsedId.error);
  const draft = parseDraft(actor, input);
  if (!draft.ok) return draft;
  try {
    const previousImageUrl = (await getEventForEdit(actor, parsedId.data))?.imageUrl;
    const { status, slug } = await updateEvent(actor, parsedId.data, draft.data);
    if (status === "published") revalidatePublicEvent(slug);
    if (previousImageUrl && previousImageUrl !== draft.data.imageUrl) {
      after(() => deleteOwnCoverBestEffort(previousImageUrl));
    }
    return { ok: true };
  } catch (error) {
    return failure("updateEventAction", error);
  }
}

/** Elimina un borrador sin órdenes ni inventario y, después de responder, su portada si era nuestra. */
export async function deleteEventAction(id: unknown): Promise<EventDraftActionResult> {
  const actor = await requirePermission("events:manageOwn");
  const parsedId = eventIdSchema.safeParse(id);
  if (!parsedId.success) return invalid(parsedId.error);
  try {
    const imageUrl = (await getEventForEdit(actor, parsedId.data))?.imageUrl;
    await deleteEvent(actor, parsedId.data);
    if (imageUrl) after(() => deleteOwnCoverBestEffort(imageUrl));
    return { ok: true };
  } catch (error) {
    return failure("deleteEventAction", error);
  }
}

/**
 * Enlace a Editar si quien mira puede editar el evento (organizador dueño, admin o super_admin: mismo alcance que
 * `getEventForEdit`); `null` sin sesión, sin permiso o si es ajeno. No redirige: la llama el botón del detalle público
 * tras montar, para que la página siga siendo estática (spec event-editing, Decisión 4).
 */
export async function getEventEditHref(eventId: unknown): Promise<string | null> {
  const parsedId = eventIdSchema.safeParse(eventId);
  if (!parsedId.success) return null;
  const actor = await getSessionUser();
  if (!actor || !can(actor, "events:manageOwn")) return null;
  const event = await getEventForEdit(actor, parsedId.data);
  return event ? `/organizador/eventos/${event.id}/editar` : null;
}
