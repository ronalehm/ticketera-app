import "server-only";

import type { z } from "zod";
import { describeError } from "@/lib/describeError";
import { OrganizerNotApprovedError } from "@/modules/auth/server";
import type { EventDraftActionFailure } from "../types/organizer.types";
import {
  ACTOR_NOT_APPROVED_ERROR,
  EVENT_DRAFT_GENERIC_ERROR,
  EventDraftError,
  getEventDraftErrorMessage,
} from "../utils/eventDraftError";

// Fallos de las acciones de eventos del panel (borradores y moderación): sin "use server", solo lo importan ellas.

/** Entrada no válida: el primer mensaje. */
export function invalidInput(error: z.ZodError): EventDraftActionFailure {
  return { ok: false, error: error.issues[0]?.message ?? EVENT_DRAFT_GENERIC_ERROR };
}

/** Error de dominio → su mensaje (y su `code`); cualquier otro → mensaje genérico y log sin datos personales. */
export function toEventActionFailure(action: string, error: unknown): EventDraftActionFailure {
  if (error instanceof EventDraftError) return { ok: false, error: getEventDraftErrorMessage(error), code: error.code };
  if (error instanceof OrganizerNotApprovedError) return { ok: false, error: ACTOR_NOT_APPROVED_ERROR };
  console.error(action, describeError(error));
  return { ok: false, error: EVENT_DRAFT_GENERIC_ERROR };
}
