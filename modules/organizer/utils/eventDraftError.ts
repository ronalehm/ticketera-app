import type { ManagedEventStatus } from "@/modules/events";
import { formatPublishIssues, type PublishIssue } from "./publishRequirements";

/** Códigos de los errores de dominio de los eventos del panel: CRUD (F5a), moderación y cambios sensibles (F5b). */
export type EventDraftErrorCode =
  | "not_found"
  | "delete_not_draft"
  | "has_activity"
  | "organizer_required"
  | "organizer_not_approved"
  | "venue_required"
  | "venue_not_approved"
  | "section_not_in_venue"
  | "slug_taken"
  // F5b: edición fuera de borrador (Decisión 11; en revisión, cancelado o finalizado, `edit_locked`).
  | "edit_locked"
  | "structure_locked"
  | "sensitive_locked"
  // F5b: moderación.
  | "incomplete"
  | "not_moderator"
  | "submit_not_draft"
  | "not_pending_review"
  | "cancel_not_published"
  | "has_sales"
  | "inventory_exists"
  | "owner_not_approved"
  | "event_venue_not_approved"
  | "review_note_required";

/**
 * Error de dominio de los eventos del panel: la acción traduce `code` a un mensaje (`getEventDraftErrorMessage`).
 * `issues` (solo `incomplete`) dice qué le falta al evento para publicarse; `status` (solo `edit_locked`), en qué estado
 * está el evento que no se puede editar.
 */
export class EventDraftError extends Error {
  override name = "EventDraftError";

  constructor(
    readonly code: EventDraftErrorCode,
    readonly issues: PublishIssue[] = [],
    readonly status?: ManagedEventStatus,
  ) {
    super(code);
  }
}

/** Mensaje de cualquier fallo no previsto (acción, red o servidor) al guardar, eliminar o moderar un evento. */
export const EVENT_DRAFT_GENERIC_ERROR = "No pudimos completar la solicitud. Inténtalo de nuevo.";

/** El organizador de la sesión está `pending`, `suspended` o no tiene fila de organizador (`OrganizerNotApprovedError`). */
export const ACTOR_NOT_APPROVED_ERROR = "Tu cuenta de organizador no está aprobada.";

/** Un evento en revisión no se edita (Editar y `edit_locked`): lo que se aprueba es lo que se revisó. */
export const EDIT_IN_REVIEW_MESSAGE = "Está en revisión: si necesitas cambios, pide al administrador que lo rechace.";

/** Cancelar un evento con ventas está bloqueado hasta que lleguen los reembolsos (Decisión 12). */
export const CANCEL_WITH_SALES_MESSAGE = "Cancelación con reembolsos: Próximamente";

export const EVENT_DRAFT_ERROR_MESSAGES = {
  not_found: "El evento no existe o no tienes acceso a él.",
  delete_not_draft: "Solo se pueden eliminar borradores.",
  has_activity: "El borrador ya tiene inventario u órdenes: no se puede modificar ni eliminar.",
  organizer_required: "Elige el organizador del evento.",
  organizer_not_approved: "El organizador elegido no está aprobado.",
  venue_required: "Elige el recinto para vender entradas.",
  venue_not_approved: "El recinto elegido no existe o no está aprobado.",
  section_not_in_venue: "Alguna sección elegida no pertenece al recinto.",
  slug_taken: "Otro evento con un nombre parecido se guardó a la vez. Inténtalo de nuevo.",
  edit_locked: "Un evento cancelado o finalizado ya no se puede editar.",
  structure_locked: "En un evento publicado no se pueden cambiar el recinto, las secciones a la venta ni el organizador.",
  sensitive_locked:
    "El evento tiene ventas o reservas en curso: solo puedes cambiar el título, la descripción, la portada y la edad mínima.",
  incomplete: "Faltan datos para publicar el evento.",
  not_moderator: "Solo un administrador puede aprobar, rechazar o cancelar eventos.",
  submit_not_draft: "Solo se pueden enviar a revisión borradores.",
  not_pending_review: "El evento ya no está en revisión.",
  cancel_not_published: "Solo se pueden cancelar eventos publicados.",
  has_sales: `${CANCEL_WITH_SALES_MESSAGE}. El evento tiene ventas o reservas en curso y aún no se puede cancelar.`,
  inventory_exists: "El evento ya tiene inventario: no se puede volver a generar.",
  owner_not_approved: "El organizador del evento ya no está aprobado: no se puede publicar hasta que lo esté.",
  event_venue_not_approved: "El recinto del evento ya no está aprobado: no se puede publicar hasta que lo esté.",
  review_note_required: "Escribe el motivo del rechazo.",
} satisfies Record<EventDraftErrorCode, string>;

/** Mensaje de un error de dominio; con `incomplete`, qué falta exactamente; con `edit_locked` en revisión, qué hacer. */
export function getEventDraftErrorMessage(error: EventDraftError): string {
  if (error.code === "incomplete" && error.issues.length > 0) return formatPublishIssues(error.issues);
  if (error.code === "edit_locked" && error.status === "pending_review") return EDIT_IN_REVIEW_MESSAGE;
  return EVENT_DRAFT_ERROR_MESSAGES[error.code];
}
