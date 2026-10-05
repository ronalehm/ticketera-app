import "server-only";

import { randomUUID } from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { and, count, desc, DrizzleQueryError, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { escapeLike } from "@/lib/db/escapeLike";
import { events } from "@/lib/db/schema/events";
import { auditLogs, organizers, users } from "@/lib/db/schema/identity";
import { payouts } from "@/lib/db/schema/sales";
import { env } from "@/lib/env";
import { userListItemSchema, usersFiltersSchema } from "../schemas/users.schema";
import type {
  InviteOutcome,
  InviteUserInput,
  OrganizerPatch,
  UpdateUserInput,
  UserOrganizerStatus,
  UserRole,
  UsersFiltersInput,
  UsersPage,
} from "../types/users.types";
import { getAssignRoleBlockReason, getManageBlockReason } from "../utils/manageBlockReason";
import { UserManagementError } from "../utils/userManagementError";

// Gestión de usuarios del panel admin (spec admin-panel, F4). Autorizar la acción (`users:manage`) es tarea de quien
// llama (`requirePermission`); aquí se aplican las reglas sobre el usuario objetivo y el rol (`canManageUser`,
// `canAssignRole`), los bloqueos del organizador y la auditoría.
//
// Clerk va siempre DESPUÉS del commit: si falla, la BD manda (el rol de la sesión se lee de `users`, no de Clerk).
// - Sincronizar `publicMetadata.role` es best effort: un fallo se registra y la operación sigue siendo un éxito.
// - Una invitación que no se pudo enviar lanza `clerk_unavailable`; la fila ya está precreada e invitar de nuevo la
//   reenvía (caso "fila precreada sin clerk_id"). La auditoría `user.invited` se escribe solo cuando Clerk la acepta.
// - `deleteUser` llama a Clerk ANTES de anonimizar (ver su doc).

type Actor = { id: string; role: UserRole };
type Queryable = Pick<typeof db, "select">;
type Transactional = Pick<typeof db, "transaction">;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Comisión de un organizador nuevo creado desde el panel: 10 % fijo, la misma del seed (decisión del usuario en F4).
 * Editarla por organizador queda para la futura página "Organizadores".
 */
const DEFAULT_COMMISSION_BPS = 1000;

/** Estados de evento que impiden quitar el rol organizer o eliminar al organizador. */
const ACTIVE_EVENT_STATUSES = ["pending_review", "published"] as const;

/** Payload de `audit_logs`: solo transiciones o la acción, nunca PII ni `clerk_id`. */
type AuditPayload =
  | { field: "role"; from: UserRole; to: UserRole }
  | { field: "organizerStatus"; from: UserOrganizerStatus | null; to: UserOrganizerStatus | null }
  | { action: "invite" | "delete" };

// ─── Listado ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Nombre, apellido, nombre completo o correo contienen `q`. */
function matchesQuery(q: string): SQL | undefined {
  const pattern = `%${escapeLike(q)}%`;
  return or(
    ilike(users.email, pattern),
    ilike(sql`${users.firstName} || ' ' || ${users.lastName}`, pattern),
  );
}

/**
 * Página de usuarios no anonimizados, del más reciente al más antiguo, con su estado de organizador y datos fiscales.
 * `q` busca en nombre y correo (sin comodines: `%`, `_` y `\` se buscan literalmente). Nunca devuelve el `clerk_id`.
 */
export async function listUsers(
  filters: UsersFiltersInput = {},
  database: Queryable = db,
): Promise<UsersPage> {
  const { q, role, organizerStatus, page, pageSize } = usersFiltersSchema.parse(filters);
  const where = and(
    isNull(users.anonymizedAt),
    role === "all" ? undefined : eq(users.role, role),
    // Un ex organizador conserva su fila `suspended`: el filtro de estado solo cuenta a quien tiene el rol organizer.
    organizerStatus === "all" ? undefined : and(eq(users.role, "organizer"), eq(organizers.status, organizerStatus)),
    q ? matchesQuery(q) : undefined,
  );

  const [rows, [{ total }]] = await Promise.all([
    database
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        organizerStatus: organizers.status,
        legalName: organizers.legalName,
        taxIdType: organizers.taxIdType,
        taxId: organizers.taxId,
        createdAt: users.createdAt,
        hasClerkAccount: sql<boolean>`${users.clerkId} is not null`,
      })
      .from(users)
      .leftJoin(organizers, eq(organizers.userId, users.id))
      .where(where)
      .orderBy(desc(users.createdAt), users.id)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    database.select({ total: count() }).from(users).leftJoin(organizers, eq(organizers.userId, users.id)).where(where),
  ]);

  const items = userListItemSchema.array().parse(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })));
  return { items, total, page, pageSize };
}

// ─── Reglas comunes ───────────────────────────────────────────────────────────────────────────────────────────────

type Target = { id: string; role: UserRole; clerkId: string | null };
type OrganizerRow = { status: UserOrganizerStatus } | null;

function assertCanManage(actor: Actor, target: Target) {
  const reason = getManageBlockReason(actor, target);
  if (reason) throw new UserManagementError(reason);
}

function assertCanAssign(actor: Actor, role: UserRole) {
  const reason = getAssignRoleBlockReason(actor, role);
  if (reason) throw new UserManagementError(reason);
}

/** Usuario no anonimizado, bloqueado hasta el final de la transacción; `not_found` si no existe. */
async function lockTarget(tx: Tx, id: string): Promise<Target> {
  const [target] = await tx
    .select({ id: users.id, role: users.role, clerkId: users.clerkId })
    .from(users)
    .where(and(eq(users.id, id), isNull(users.anonymizedAt)))
    .for("update");
  if (!target) throw new UserManagementError("not_found");
  return target;
}

/** Fila de `organizers` del usuario (bloqueada) o `null`. */
async function lockOrganizer(tx: Tx, userId: string): Promise<OrganizerRow> {
  const [row] = await tx
    .select({ status: organizers.status })
    .from(organizers)
    .where(eq(organizers.userId, userId))
    .for("update");
  return row ?? null;
}

/** Lanza `organizer_has_activity` si tiene eventos `pending_review`/`published` o payouts `pending`. */
async function assertNoOrganizerActivity(tx: Tx, userId: string) {
  const [[{ activeEvents }], [{ pendingPayouts }]] = await Promise.all([
    tx
      .select({ activeEvents: count() })
      .from(events)
      .where(and(eq(events.organizerId, userId), inArray(events.status, ACTIVE_EVENT_STATUSES))),
    tx
      .select({ pendingPayouts: count() })
      .from(payouts)
      .where(and(eq(payouts.organizerId, userId), eq(payouts.status, "pending"))),
  ]);
  if (activeEvents > 0 || pendingPayouts > 0) {
    throw new UserManagementError("organizer_has_activity", { activeEvents, pendingPayouts });
  }
}

const AUDIT_ACTIONS = {
  role: "user.role_changed",
  organizerStatus: "user.organizer_status_changed",
  invite: "user.invited",
  delete: "user.deleted",
} as const;

/** Un registro de `audit_logs` por transición o acción. */
async function writeAudit(tx: Tx, actorId: string, targetId: string, payloads: AuditPayload[]) {
  if (payloads.length === 0) return;
  await tx.insert(auditLogs).values(
    payloads.map((payload) => ({
      actorId,
      action: AUDIT_ACTIONS["field" in payload ? payload.field : payload.action],
      targetType: "user",
      targetId,
      payload,
    })),
  );
}

type UserChanges = { role: UserRole; firstName?: string; lastName?: string; organizer?: OrganizerPatch };

/**
 * Aplica rol, nombres y datos de organizador a `target` y audita cada transición. Reglas:
 * - Quitar el rol organizer exige no tener actividad (`assertNoOrganizerActivity`) y deja su fila `suspended`.
 * - Pasar a organizer crea la fila `pending` (o la reactiva a `pending` si estaba `suspended`), salvo que
 *   `organizer.status` diga otro estado.
 * - Con rol final organizer se aplican los datos fiscales de `organizer` (omitido = sin cambios; `null` = borrar).
 */
async function applyUserChanges(
  tx: Tx,
  actorId: string,
  target: Target,
  organizer: OrganizerRow,
  changes: UserChanges,
): Promise<{ roleChanged: boolean }> {
  const roleChanged = changes.role !== target.role;
  const leaving = roleChanged && target.role === "organizer";
  const entering = roleChanged && changes.role === "organizer";
  if (leaving) await assertNoOrganizerActivity(tx, target.id);

  if (roleChanged || changes.firstName !== undefined || changes.lastName !== undefined) {
    await tx
      .update(users)
      .set({ role: changes.role, firstName: changes.firstName, lastName: changes.lastName })
      .where(eq(users.id, target.id));
  }

  const currentStatus = organizer?.status ?? null;
  let nextStatus = currentStatus;
  if (changes.role === "organizer") {
    const { status, legalName, taxIdType, taxId } = changes.organizer ?? {};
    const reactivated = entering && (currentStatus === null || currentStatus === "suspended") ? "pending" : currentStatus;
    nextStatus = status ?? reactivated ?? "pending";
    const fiscal = { legalName, taxIdType, taxId };
    if (!organizer) {
      await tx
        .insert(organizers)
        .values({ userId: target.id, status: nextStatus, commissionBps: DEFAULT_COMMISSION_BPS, ...fiscal });
    } else if (nextStatus !== currentStatus || Object.values(fiscal).some((value) => value !== undefined)) {
      await tx.update(organizers).set({ status: nextStatus, ...fiscal }).where(eq(organizers.userId, target.id));
    }
  } else if (leaving && organizer && currentStatus !== "suspended") {
    nextStatus = "suspended";
    await tx.update(organizers).set({ status: nextStatus }).where(eq(organizers.userId, target.id));
  }

  const audit: AuditPayload[] = [];
  if (roleChanged) audit.push({ field: "role", from: target.role, to: changes.role });
  if (nextStatus !== currentStatus) audit.push({ field: "organizerStatus", from: currentStatus, to: nextStatus });
  await writeAudit(tx, actorId, target.id, audit);
  return { roleChanged };
}

/**
 * Ejecuta `run` en una transacción y traduce las violaciones de restricciones a errores de dominio: aprobar sin datos
 * fiscales (CHECK, 23514), RUC/DNI repetido (UNIQUE, 23505) y correo repetido (UNIQUE, 23505: dos invitaciones
 * simultáneas al mismo correo nuevo; el `SELECT … FOR UPDATE` no bloquea una fila que aún no existe) → `conflict`.
 */
async function inTransaction<T>(database: Transactional, run: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await database.transaction(run);
  } catch (error) {
    const cause = error instanceof DrizzleQueryError ? error.cause : error;
    const { code, constraint } = (cause ?? {}) as { code?: unknown; constraint?: unknown };
    if (code === "23514" && constraint === "organizers_approved_complete_check") {
      throw new UserManagementError("missing_tax_data");
    }
    if (code === "23505" && constraint === "organizers_tax_id_unique") throw new UserManagementError("tax_id_taken");
    if (code === "23505" && constraint === "users_email_unique") throw new UserManagementError("conflict");
    throw error;
  }
}

// ─── Clerk (siempre fuera de la transacción) ─────────────────────────────────────────────────────────────────────

/** Solo nombre y status HTTP: el mensaje de Clerk puede llevar el correo o el id del usuario. */
function logClerkError(operation: string, error: unknown) {
  const status = (error as { status?: unknown } | null)?.status;
  console.error(`users.service: Clerk ${operation}`, { name: error instanceof Error ? error.name : typeof error, status });
}

async function sendInvitation(emailAddress: string, role: UserRole) {
  try {
    const client = await clerkClient();
    await client.invitations.createInvitation({
      emailAddress,
      redirectUrl: `${env.APP_URL}/registro`,
      publicMetadata: { role },
      ignoreExisting: true,
    });
  } catch (error) {
    logClerkError("createInvitation", error);
    throw new UserManagementError("clerk_unavailable");
  }
}

/** Replica el rol en `publicMetadata.role`. Best effort: si falla se registra y la BD manda. */
async function syncClerkRole(clerkId: string, role: UserRole) {
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkId, { publicMetadata: { role } });
  } catch (error) {
    logClerkError("updateUserMetadata", error);
  }
}

/** Borra el usuario de Clerk; un 404 (ya borrado, p. ej. en un reintento) cuenta como éxito. */
async function deleteClerkUser(clerkId: string) {
  try {
    const client = await clerkClient();
    await client.users.deleteUser(clerkId);
  } catch (error) {
    if ((error as { status?: unknown } | null)?.status === 404) return;
    logClerkError("deleteUser", error);
    throw new UserManagementError("clerk_unavailable");
  }
}

// ─── Mutaciones ───────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Invita a `email` con `role` (organizer o admin; admin solo un super_admin):
 * 1. correo nuevo → fila precreada (`clerk_id NULL`, nombres "", el rol; `organizers` `pending` si es organizer) e
 *    invitación de Clerk a `<APP_URL>/registro` con `publicMetadata.role` (`invited`);
 * 2. fila precreada sin `clerk_id` → cambia el rol si es otro y reenvía la invitación (`reinvited`);
 * 3. usuario con cuenta de Clerk → solo cambia el rol y lo sincroniza en `publicMetadata.role`, sin invitación
 *    (`roleUpdated`);
 * 4. objetivo que el actor no puede gestionar (él mismo, un super_admin o, siendo admin, otro admin) → error.
 * La auditoría `user.invited` (casos 1 y 2) se escribe después de que Clerk acepte la invitación: si Clerk falla no
 * queda registro de una invitación que no salió. Otra invitación simultánea al mismo correo nuevo → `conflict`.
 */
export async function inviteUser(
  actor: Actor,
  input: InviteUserInput,
  database: Transactional = db,
): Promise<{ userId: string; outcome: InviteOutcome }> {
  assertCanAssign(actor, input.role);
  const email = input.email.trim().toLowerCase();

  const result = await inTransaction(database, async (tx) => {
    const [existing] = await tx
      .select({ id: users.id, role: users.role, clerkId: users.clerkId })
      .from(users)
      .where(and(sql`lower(${users.email}) = ${email}`, isNull(users.anonymizedAt)))
      .for("update");

    if (!existing) {
      const [{ id }] = await tx
        .insert(users)
        .values({ email, firstName: "", lastName: "", role: input.role })
        .returning({ id: users.id });
      if (input.role === "organizer") {
        await tx.insert(organizers).values({ userId: id, status: "pending", commissionBps: DEFAULT_COMMISSION_BPS });
      }
      return { userId: id, clerkId: null, outcome: "invited" as const };
    }

    assertCanManage(actor, existing);
    await applyUserChanges(tx, actor.id, existing, await lockOrganizer(tx, existing.id), { role: input.role });
    if (existing.clerkId) return { userId: existing.id, clerkId: existing.clerkId, outcome: "roleUpdated" as const };
    return { userId: existing.id, clerkId: null, outcome: "reinvited" as const };
  });

  if (result.clerkId) {
    await syncClerkRole(result.clerkId, input.role);
  } else {
    await sendInvitation(email, input.role);
    await inTransaction(database, (tx) => writeAudit(tx, actor.id, result.userId, [{ action: "invite" }]));
  }
  return { userId: result.userId, outcome: result.outcome };
}

/**
 * Edita nombres, rol y datos de organizador de `id` (el correo no se edita). Exige `canManageUser` y `canAssignRole`.
 * Aprobar sin datos fiscales → `missing_tax_data`; RUC/DNI de otro organizador → `tax_id_taken`; quitar el rol
 * organizer con actividad → `organizer_has_activity`. Si cambió el rol y tiene cuenta, lo sincroniza en Clerk.
 */
export async function updateUser(
  actor: Actor,
  id: string,
  input: UpdateUserInput,
  database: Transactional = db,
): Promise<void> {
  const result = await inTransaction(database, async (tx) => {
    const target = await lockTarget(tx, id);
    assertCanManage(actor, target);
    assertCanAssign(actor, input.role);
    const { roleChanged } = await applyUserChanges(tx, actor.id, target, await lockOrganizer(tx, id), input);
    return { clerkId: target.clerkId, roleChanged };
  });
  if (result.clerkId && result.roleChanged) await syncClerkRole(result.clerkId, input.role);
}

/** Aprobar o suspender a un organizador (botón de la tabla). Mismas reglas que `updateUser`; aprobar exige datos fiscales. */
export async function setOrganizerStatus(
  actor: Actor,
  id: string,
  status: UserOrganizerStatus,
  database: Transactional = db,
): Promise<void> {
  await inTransaction(database, async (tx) => {
    const target = await lockTarget(tx, id);
    assertCanManage(actor, target);
    if (target.role !== "organizer") throw new UserManagementError("not_organizer");
    await applyUserChanges(tx, actor.id, target, await lockOrganizer(tx, id), { role: target.role, organizer: { status } });
  });
}

/** Reglas y bloqueos de eliminar (los mismos que quitar el rol organizer si tiene fila de organizador). */
async function validateDeletion(tx: Tx, actor: Actor, id: string) {
  const target = await lockTarget(tx, id);
  assertCanManage(actor, target);
  const organizer = await lockOrganizer(tx, id);
  if (organizer || target.role === "organizer") await assertNoOrganizerActivity(tx, id);
  return { ...target, organizer };
}

/**
 * Elimina a `id`, reintentable: 1) valida reglas y bloqueos; 2) borra su usuario de Clerk si tiene `clerk_id` (404 =
 * éxito); 3) anonimiza la fila (sin `clerk_id`, correo `deleted+<uuid>@anon.invalid`, "Usuario Eliminado", sin
 * teléfono ni documento, `anonymized_at`), suspende su fila de organizador y audita. Si Clerk falla no se toca la BD
 * (`clerk_unavailable`); si la BD falla después de borrar en Clerk, un reintento recibe 404 y completa la anonimización.
 */
export async function deleteUser(actor: Actor, id: string, database: Transactional = db): Promise<void> {
  const { clerkId } = await inTransaction(database, (tx) => validateDeletion(tx, actor, id));
  if (clerkId) await deleteClerkUser(clerkId);

  // Ventana conocida: si Clerk ya borró la cuenta y esta revalidación falla (p. ej. el organizador pasó a tener un
  // evento en revisión o publicado, o un payout pendiente, entre las dos transacciones), la fila queda sin anonimizar y
  // con el `clerk_id` de una cuenta que ya no existe. Reintentar se bloquea con el mismo motivo hasta resolverlo;
  // resuelto, el reintento recibe 404 de Clerk (cuenta como éxito en `deleteClerkUser`) y completa la anonimización,
  // así que el reintento es idempotente.
  await inTransaction(database, async (tx) => {
    const current = await validateDeletion(tx, actor, id);
    // Vinculó una cuenta de Clerk distinta entre la validación y ahora: reintentar la borra también.
    if (current.clerkId && current.clerkId !== clerkId) throw new UserManagementError("conflict");

    await tx
      .update(users)
      .set({
        clerkId: null,
        email: `deleted+${randomUUID()}@anon.invalid`,
        firstName: "Usuario",
        lastName: "Eliminado",
        phone: null,
        documentType: null,
        documentNumber: null,
        anonymizedAt: sql`now()`,
      })
      .where(eq(users.id, id));

    // Decisión del usuario (F4): la fila de `organizers` conserva razón social y RUC/DNI como respaldo contable de sus
    // ventas; solo se suspende. Si la persona vuelve, su RUC/DNI ya figura registrado (`tax_id_taken`).
    const audit: AuditPayload[] = [];
    if (current.organizer && current.organizer.status !== "suspended") {
      await tx.update(organizers).set({ status: "suspended" }).where(eq(organizers.userId, id));
      audit.push({ field: "organizerStatus", from: current.organizer.status, to: "suspended" });
    }
    audit.push({ action: "delete" });
    await writeAudit(tx, actor.id, id, audit);
  });
}
