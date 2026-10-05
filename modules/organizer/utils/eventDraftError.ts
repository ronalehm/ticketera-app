/** Códigos de los errores de dominio del CRUD de borradores (spec admin-panel, F5a). */
export type EventDraftErrorCode =
  | "not_found"
  | "edit_not_draft"
  | "delete_not_draft"
  | "has_activity"
  | "organizer_required"
  | "organizer_not_approved"
  | "venue_required"
  | "venue_not_approved"
  | "section_not_in_venue"
  | "slug_taken";

/** Error de dominio del CRUD de borradores: la acción traduce `code` a un mensaje (`EVENT_DRAFT_ERROR_MESSAGES`). */
export class EventDraftError extends Error {
  override name = "EventDraftError";

  constructor(readonly code: EventDraftErrorCode) {
    super(code);
  }
}

/** Mensaje de cualquier fallo no previsto (acción, red o servidor) al guardar o eliminar un borrador. */
export const EVENT_DRAFT_GENERIC_ERROR = "No pudimos completar la solicitud. Inténtalo de nuevo.";

/** El organizador de la sesión está `pending`, `suspended` o no tiene fila de organizador (`OrganizerNotApprovedError`). */
export const ACTOR_NOT_APPROVED_ERROR = "Tu cuenta de organizador no está aprobada.";

export const EVENT_DRAFT_ERROR_MESSAGES = {
  not_found: "El evento no existe o no tienes acceso a él.",
  edit_not_draft: "Solo se pueden editar borradores.",
  delete_not_draft: "Solo se pueden eliminar borradores.",
  has_activity: "El borrador ya tiene inventario u órdenes: no se puede modificar ni eliminar.",
  organizer_required: "Elige el organizador del evento.",
  organizer_not_approved: "El organizador elegido no está aprobado.",
  venue_required: "Elige el recinto para vender entradas.",
  venue_not_approved: "El recinto elegido no existe o no está aprobado.",
  section_not_in_venue: "Alguna sección elegida no pertenece al recinto.",
  slug_taken: "Otro evento con un nombre parecido se guardó a la vez. Inténtalo de nuevo.",
} satisfies Record<EventDraftErrorCode, string>;
