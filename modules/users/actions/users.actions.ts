"use server";

import type { z } from "zod";
import { describeError } from "@/lib/describeError";
import { requirePermission } from "@/modules/auth/server";
import {
  inviteUserSchema,
  organizerStatusSchema,
  updateUserSchema,
  userIdSchema,
  usersFiltersSchema,
} from "../schemas/users.schema";
import { deleteUser, inviteUser, listUsers, setOrganizerStatus, updateUser } from "../services/users.service";
import type { InviteOutcome, UsersActionFailure, UsersActionResult, UsersPage } from "../types/users.types";
import { GENERIC_ERROR, getUserManagementErrorMessage, UserManagementError } from "../utils/userManagementError";

// Acciones de `/admin/usuarios` (spec admin-panel, F4). Todas exigen `users:manage` (`requirePermission` redirige sin
// él) y devuelven un resultado discriminado: `{ ok: true, ... }` o `{ ok: false, error, code?, fieldErrors? }`, con
// `error` en español.

/** Entrada no válida: el primer mensaje como error y, si los hay, los de cada campo (`organizer.taxId`). */
function invalid(error: z.ZodError): UsersActionFailure {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".");
    if (field) (fieldErrors[field] ??= []).push(issue.message);
  }
  const message = error.issues[0]?.message ?? GENERIC_ERROR;
  return Object.keys(fieldErrors).length > 0 ? { ok: false, error: message, fieldErrors } : { ok: false, error: message };
}

/** Error de dominio → su mensaje y su `code`; cualquier otro → mensaje genérico y log sin datos personales. */
function failure(action: string, error: unknown): UsersActionFailure {
  if (error instanceof UserManagementError) {
    const message = getUserManagementErrorMessage(error);
    return error.code === "tax_id_taken"
      ? { ok: false, error: message, code: error.code, fieldErrors: { "organizer.taxId": [message] } }
      : { ok: false, error: message, code: error.code };
  }
  console.error(action, describeError(error));
  return { ok: false, error: GENERIC_ERROR };
}

/** Página de usuarios con los filtros dados (los omitidos, por defecto). */
export async function listUsersAction(input: unknown): Promise<UsersActionResult<{ data: UsersPage }>> {
  await requirePermission("users:manage");
  const parsed = usersFiltersSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    return { ok: true, data: await listUsers(parsed.data) };
  } catch (error) {
    return failure("listUsersAction", error);
  }
}

/** Invitar (correo + rol organizer/admin). `outcome` dice si se envió, reenvió o solo cambió el rol. */
export async function inviteUserAction(input: unknown): Promise<UsersActionResult<{ outcome: InviteOutcome }>> {
  const actor = await requirePermission("users:manage");
  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    const { outcome } = await inviteUser(actor, parsed.data);
    return { ok: true, outcome };
  } catch (error) {
    return failure("inviteUserAction", error);
  }
}

/** Editar nombres, rol y datos de organizador. */
export async function updateUserAction(id: unknown, input: unknown): Promise<UsersActionResult> {
  const actor = await requirePermission("users:manage");
  const parsedId = userIdSchema.safeParse(id);
  if (!parsedId.success) return invalid(parsedId.error);
  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  try {
    await updateUser(actor, parsedId.data, parsed.data);
    return { ok: true };
  } catch (error) {
    return failure("updateUserAction", error);
  }
}

/** Aprobar o suspender a un organizador (aprobar exige sus datos fiscales). */
export async function setOrganizerStatusAction(id: unknown, status: unknown): Promise<UsersActionResult> {
  const actor = await requirePermission("users:manage");
  const parsedId = userIdSchema.safeParse(id);
  if (!parsedId.success) return invalid(parsedId.error);
  const parsedStatus = organizerStatusSchema.safeParse(status);
  if (!parsedStatus.success) return invalid(parsedStatus.error);
  try {
    await setOrganizerStatus(actor, parsedId.data, parsedStatus.data);
    return { ok: true };
  } catch (error) {
    return failure("setOrganizerStatusAction", error);
  }
}

/** Eliminar (anonimizar) un usuario. Reintentable si falla. */
export async function deleteUserAction(id: unknown): Promise<UsersActionResult> {
  const actor = await requirePermission("users:manage");
  const parsedId = userIdSchema.safeParse(id);
  if (!parsedId.success) return invalid(parsedId.error);
  try {
    await deleteUser(actor, parsedId.data);
    return { ok: true };
  } catch (error) {
    return failure("deleteUserAction", error);
  }
}
