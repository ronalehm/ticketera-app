import type { OrganizerBlockers, UserManagementErrorCode } from "../types/users.types";

/** Error de dominio de la gestión de usuarios: `code` lo traduce la acción a un mensaje (`getUserManagementErrorMessage`). */
export class UserManagementError extends Error {
  override name = "UserManagementError";

  constructor(
    readonly code: UserManagementErrorCode,
    /** Solo con `organizer_has_activity`: qué falta resolver. */
    readonly blockers?: OrganizerBlockers,
  ) {
    super(code);
  }
}

/** Mensaje de cualquier fallo no previsto (acción, red o servidor) en la gestión de usuarios. */
export const GENERIC_ERROR = "No pudimos completar la solicitud. Inténtalo de nuevo.";

const MESSAGES = {
  self: "No puedes modificar ni eliminar tu propia cuenta.",
  protected: "Esta cuenta está protegida: no se puede modificar ni eliminar.",
  super_admin_only: "Solo el super admin puede gestionar administradores.",
  role_not_assignable: "Ese rol no se puede asignar desde el panel.",
  not_found: "El usuario no existe o ya fue eliminado.",
  not_organizer: "El usuario no es organizador.",
  missing_tax_data: "Faltan datos fiscales: razón social, tipo de documento fiscal y RUC/DNI.",
  tax_id_taken: "Ese RUC/DNI ya está registrado.",
  organizer_has_activity: "El organizador tiene actividad pendiente.",
  clerk_unavailable: "No pudimos conectar con el servicio de cuentas. Inténtalo de nuevo.",
  conflict: "El usuario cambió mientras procesábamos la solicitud. Inténtalo de nuevo.",
} satisfies Record<UserManagementErrorCode, string>;

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

/** Mensaje en español del error; con `organizer_has_activity`, detalla qué resolver. */
export function getUserManagementErrorMessage(error: UserManagementError): string {
  if (error.code !== "organizer_has_activity" || !error.blockers) return MESSAGES[error.code];

  const { activeEvents, pendingPayouts } = error.blockers;
  const pending = [
    activeEvents > 0 && plural(activeEvents, "evento publicado o en revisión", "eventos publicados o en revisión"),
    pendingPayouts > 0 && plural(pendingPayouts, "pago pendiente", "pagos pendientes"),
  ].filter(Boolean);
  return `No se puede quitar el rol de organizador ni eliminar la cuenta: tiene ${pending.join(" y ")}. Primero devuelve a borrador o cancela esos eventos y liquida los pagos pendientes.`;
}
