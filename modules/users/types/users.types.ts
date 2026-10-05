import type { z } from "zod";

import type {
  invitableRoleSchema,
  inviteUserSchema,
  organizerPatchSchema,
  organizerStatusSchema,
  taxIdTypeSchema,
  updateUserSchema,
  userListItemSchema,
  userRoleSchema,
  USERS_PAGE_SIZES,
  usersFiltersSchema,
} from "../schemas/users.schema";

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserOrganizerStatus = z.infer<typeof organizerStatusSchema>;
export type TaxIdType = z.infer<typeof taxIdTypeSchema>;
export type InvitableRole = z.infer<typeof invitableRoleSchema>;
export type UsersPageSize = (typeof USERS_PAGE_SIZES)[number];

/** Filtros ya normalizados (con valores por defecto). */
export type UsersFilters = z.infer<typeof usersFiltersSchema>;
export type UserListItem = z.infer<typeof userListItemSchema>;

export type UsersPage = {
  items: UserListItem[];
  /** Usuarios que cumplen los filtros (todas las páginas). */
  total: number;
  page: number;
  pageSize: UsersPageSize;
};

/** Filtros que acepta `listUsers`/`listUsersAction` (los omitidos toman su valor por defecto). */
export type UsersFiltersInput = z.input<typeof usersFiltersSchema>;

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type OrganizerPatch = z.infer<typeof organizerPatchSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
/** Valores de los formularios Invitar y Editar (entrada de los schemas, antes de normalizar). */
export type InviteUserFormValues = z.input<typeof inviteUserSchema>;
export type UpdateUserFormValues = z.input<typeof updateUserSchema>;

/**
 * Resultado de invitar: `invited` (correo nuevo: fila precreada + invitación), `reinvited` (fila precreada sin cuenta:
 * rol actualizado si cambió + invitación reenviada) o `roleUpdated` (ya tiene cuenta de Clerk: solo cambia el rol).
 */
export type InviteOutcome = "invited" | "reinvited" | "roleUpdated";

/** Por qué el actor no puede gestionar a un usuario (motivo visible en la tabla en lugar de las acciones). */
export type ManageBlockReason = "self" | "protected" | "super_admin_only";

/** Bloqueos para quitar el rol organizer o eliminar a un organizador. */
export type OrganizerBlockers = { activeEvents: number; pendingPayouts: number };

export type UserManagementErrorCode =
  | ManageBlockReason
  | "role_not_assignable"
  | "not_found"
  | "not_organizer"
  | "missing_tax_data"
  | "tax_id_taken"
  | "organizer_has_activity"
  | "clerk_unavailable"
  | "conflict";

/**
 * Fallo de una acción: mensaje en español, `code` si es un error de dominio (p. ej. `not_found` o `conflict`, que
 * obligan a recargar el listado) y, si la entrada no es válida, errores por campo (`organizer.taxId`).
 */
export type UsersActionFailure = {
  ok: false;
  error: string;
  code?: UserManagementErrorCode;
  fieldErrors?: Record<string, string[]>;
};

export type UsersActionResult<T extends object = object> = ({ ok: true } & T) | UsersActionFailure;
