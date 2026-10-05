// @vitest-environment node
import { randomUUID } from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { events } from "@/lib/db/schema/events";
import { auditLogs, organizers, users } from "@/lib/db/schema/identity";
import { payouts } from "@/lib/db/schema/sales";
import { describeWithDb } from "@/lib/db/testDb";
import { createTestEvent } from "@/lib/db/testFixtures";
import { inRolledBackTransaction, type Tx } from "@/lib/db/testTransaction";
import type { UserOrganizerStatus, UserRole } from "../types/users.types";
import { UserManagementError } from "../utils/userManagementError";
import { deleteUser, inviteUser, listUsers, setOrganizerStatus, updateUser } from "./users.service";
// Solo para el test encadenado invitar → primer login: `ensureUser` no es API pública de auth (lo usa su sesión).
import { ensureUser } from "@/modules/auth/services/users.service";

// Fuera de `inRolledBackTransaction`, el `db` real; dentro, la transacción (que siempre se revierte).
vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn() }));

const clerk = {
  invitations: { createInvitation: vi.fn() },
  users: { updateUserMetadata: vi.fn(), deleteUser: vi.fn() },
};

beforeEach(() => {
  vi.mocked(clerkClient).mockResolvedValue(clerk as unknown as Awaited<ReturnType<typeof clerkClient>>);
  clerk.invitations.createInvitation.mockResolvedValue({});
  clerk.users.updateUserMetadata.mockResolvedValue({});
  clerk.users.deleteUser.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

type Fiscal = { legalName: string; taxIdType: "ruc" | "dni"; taxId: string };

type UserOptions = {
  role?: UserRole;
  clerkId?: string | null;
  email?: string;
  firstName?: string;
  lastName?: string;
  createdAt?: Date;
  organizer?: { status: UserOrganizerStatus; fiscal?: Fiscal | null };
};

/** RUC ficticio único de 11 dígitos. */
const uniqueRuc = () => `20${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;

/** Usuario de prueba (correo único) y, si se pide, su fila de organizador (con datos fiscales si es `approved`). */
async function createUser(tx: Tx, options: UserOptions = {}) {
  const suffix = randomUUID();
  const [user] = await tx
    .insert(users)
    .values({
      email: options.email ?? `users.${suffix}@example.com`,
      firstName: options.firstName ?? "Prueba",
      lastName: options.lastName ?? suffix.slice(0, 8),
      role: options.role ?? "customer",
      clerkId: options.clerkId ?? null,
      phone: "912345678",
      documentType: "dni",
      documentNumber: "87654321",
      createdAt: options.createdAt,
    })
    .returning({ id: users.id, role: users.role, email: users.email, firstName: users.firstName, lastName: users.lastName });
  if (options.organizer) {
    const { status, fiscal } = options.organizer;
    const data = fiscal === undefined && status === "approved" ? { legalName: "Prueba SAC", taxIdType: "ruc" as const, taxId: uniqueRuc() } : fiscal;
    await tx.insert(organizers).values({ userId: user.id, status, commissionBps: 1000, ...data });
  }
  return user;
}

async function getUser(tx: Tx, id: string) {
  const [row] = await tx.select().from(users).where(eq(users.id, id));
  return row;
}

async function getOrganizer(tx: Tx, id: string) {
  const [row] = await tx.select().from(organizers).where(eq(organizers.userId, id));
  return row ?? null;
}

/** Registros de `audit_logs` del usuario. Los de una misma transacción comparten `created_at`: se ordenan por contenido. */
async function getAudit(tx: Tx, targetId: string) {
  const rows = await tx
    .select({ actorId: auditLogs.actorId, action: auditLogs.action, targetType: auditLogs.targetType, payload: auditLogs.payload })
    .from(auditLogs)
    .where(eq(auditLogs.targetId, targetId));
  return sortByJson(rows);
}

/** JSON con las claves ordenadas (jsonb no conserva el orden de las claves). */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, nested: unknown) =>
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? Object.fromEntries(Object.entries(nested).sort(([a], [b]) => a.localeCompare(b)))
      : nested,
  );

const sortByJson = <T,>(list: T[]) => [...list].sort((a, b) => canonical(a).localeCompare(canonical(b)));

/** Payloads de `audit_logs` del usuario, comparables con `sortByJson(esperados)`. */
async function getAuditPayloads(tx: Tx, targetId: string) {
  return sortByJson((await getAudit(tx, targetId)).map((row) => row.payload));
}

/** Error que lanza `run` (falla si no lanza). */
async function caught(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error("se esperaba un error");
}

const errorCode = async (run: () => Promise<unknown>) => ((await caught(run)) as UserManagementError).code;

/** Organizador (de un evento de prueba en borrador) con su evento; el evento pasa a `status` si se indica. */
async function organizerWithEvent(tx: Tx, status?: "pending_review" | "published") {
  const event = await createTestEvent({ general: 2 });
  const [{ organizerId }] = await tx.select({ organizerId: events.organizerId }).from(events).where(eq(events.id, event.eventId));
  if (status) {
    const startsAt = new Date("2027-03-01T01:00:00Z");
    await tx
      .update(events)
      .set({
        status,
        description: "Evento de prueba",
        imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
        startsAt,
        doorsOpenAt: startsAt,
      })
      .where(eq(events.id, event.eventId));
  }
  return { id: organizerId, role: "organizer" as const, eventId: event.eventId };
}

describeWithDb("users.service (Postgres)", () => {
  describe("listUsers", () => {
    it("filtra por q (nombre o correo), excluye anonimizados, ordena por created_at desc e id y no expone clerk_id", async () => {
      await inRolledBackTransaction(async (tx) => {
        const token = `tok${randomUUID().slice(0, 8)}`;
        const older = await createUser(tx, { firstName: `Ana ${token}`, createdAt: new Date("2026-01-01T00:00:00Z") });
        const newer = await createUser(tx, {
          email: `${token}.newer@example.com`,
          clerkId: `user_${token}`,
          role: "organizer",
          organizer: { status: "approved" },
          createdAt: new Date("2026-02-01T00:00:00Z"),
        });
        const anonymized = await createUser(tx, { lastName: token });
        await tx.update(users).set({ anonymizedAt: new Date() }).where(eq(users.id, anonymized.id));

        const page = await listUsers({ q: token.toUpperCase() }, tx);
        expect(page).toMatchObject({ total: 2, page: 1, pageSize: 8 });
        expect(page.items.map((item) => item.id)).toEqual([newer.id, older.id]);
        expect(page.items[0]).toEqual({
          id: newer.id,
          firstName: newer.firstName,
          lastName: newer.lastName,
          email: newer.email,
          role: "organizer",
          organizerStatus: "approved",
          legalName: "Prueba SAC",
          taxIdType: "ruc",
          taxId: expect.stringMatching(/^20\d{9}$/),
          createdAt: "2026-02-01T00:00:00.000Z",
          hasClerkAccount: true,
        });
        expect(page.items[1]).toMatchObject({ organizerStatus: null, legalName: null, hasClerkAccount: false });
        expect(JSON.stringify(page)).not.toContain(`user_${token}`);
      });
    });

    it("busca por nombre completo", async () => {
      await inRolledBackTransaction(async (tx) => {
        const token = randomUUID().slice(0, 8);
        const user = await createUser(tx, { firstName: "Lucía", lastName: `Ramos${token}` });
        expect((await listUsers({ q: `lucía ramos${token}` }, tx)).items.map((item) => item.id)).toEqual([user.id]);
      });
    });

    it("pagina en SQL con count total", async () => {
      await inRolledBackTransaction(async (tx) => {
        const token = `pag${randomUUID().slice(0, 8)}`;
        const created = [];
        for (let index = 0; index < 9; index += 1) {
          created.push(await createUser(tx, { lastName: `${token}-${index}`, createdAt: new Date(Date.UTC(2026, 0, 1 + index)) }));
        }
        const newestFirst = created.map((user) => user.id).reverse();

        const first = await listUsers({ q: token, pageSize: 8, page: 1 }, tx);
        const second = await listUsers({ q: token, pageSize: 8, page: 2 }, tx);
        expect(first).toMatchObject({ total: 9, page: 1, pageSize: 8 });
        expect(first.items.map((item) => item.id)).toEqual(newestFirst.slice(0, 8));
        expect(second.items.map((item) => item.id)).toEqual(newestFirst.slice(8));
        expect((await listUsers({ q: token, pageSize: 16 }, tx)).items).toHaveLength(9);
        expect((await listUsers({ q: token, page: 3 }, tx))).toMatchObject({ items: [], total: 9 });
      });
    });

    it("filtra por rol y por estado de organizador", async () => {
      await inRolledBackTransaction(async (tx) => {
        const token = `rol${randomUUID().slice(0, 8)}`;
        const customer = await createUser(tx, { lastName: token });
        const pending = await createUser(tx, { lastName: token, role: "organizer", organizer: { status: "pending" } });
        const approved = await createUser(tx, { lastName: token, role: "organizer", organizer: { status: "approved" } });
        const ids = async (filters: Parameters<typeof listUsers>[0]) =>
          (await listUsers({ q: token, ...filters }, tx)).items.map((item) => item.id).sort();

        expect(await ids({ role: "customer" })).toEqual([customer.id]);
        expect(await ids({ role: "organizer" })).toEqual([pending.id, approved.id].sort());
        expect(await ids({ organizerStatus: "pending" })).toEqual([pending.id]);
        expect(await ids({ role: "organizer", organizerStatus: "approved" })).toEqual([approved.id]);
        expect(await ids({ role: "admin" })).toEqual([]);
      });
    });

    it("el filtro de estado solo cuenta el rol organizer: un ex organizador con fila suspended no aparece", async () => {
      await inRolledBackTransaction(async (tx) => {
        const token = `exo${randomUUID().slice(0, 8)}`;
        const suspended = await createUser(tx, { lastName: token, role: "organizer", organizer: { status: "suspended" } });
        const former = await createUser(tx, { lastName: token, role: "customer", organizer: { status: "suspended" } });
        const ids = async (filters: Parameters<typeof listUsers>[0]) =>
          (await listUsers({ q: token, ...filters }, tx)).items.map((item) => item.id);

        expect(await ids({ organizerStatus: "suspended" })).toEqual([suspended.id]);
        expect((await listUsers({ q: token, organizerStatus: "suspended" }, tx)).total).toBe(1);
        expect(await ids({ role: "customer", organizerStatus: "suspended" })).toEqual([]);
        expect(await ids({ role: "customer" })).toEqual([former.id]);
      });
    });

    it("q escapa los comodines %, _ y \\ (se buscan literalmente)", async () => {
      await inRolledBackTransaction(async (tx) => {
        const token = randomUUID().slice(0, 8);
        const percent = await createUser(tx, { lastName: `${token}50%off` });
        const underscore = await createUser(tx, { lastName: `${token}a_b` });
        const backslash = await createUser(tx, { lastName: `${token}c\\d` });
        await createUser(tx, { lastName: `${token}50Xoff` });
        await createUser(tx, { lastName: `${token}aXb` });

        const ids = async (q: string) => (await listUsers({ q }, tx)).items.map((item) => item.id);
        expect(await ids(`${token}50%off`)).toEqual([percent.id]);
        expect(await ids(`${token}a_b`)).toEqual([underscore.id]);
        expect(await ids(`${token}c\\d`)).toEqual([backslash.id]);
        expect(await ids("%")).not.toContain(underscore.id);
      });
    });
  });

  describe("inviteUser", () => {
    it("1. correo nuevo: precrea la fila (clerk_id NULL, nombres vacíos, rol) + organizers pending e invita a <APP_URL>/registro", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const email = `Nuevo.${randomUUID()}@Example.com`;

        const result = await inviteUser(admin, { email, role: "organizer" }, tx);

        expect(result.outcome).toBe("invited");
        const row = await getUser(tx, result.userId);
        expect(row).toMatchObject({ email: email.toLowerCase(), clerkId: null, firstName: "", lastName: "", role: "organizer" });
        expect(await getOrganizer(tx, result.userId)).toMatchObject({ status: "pending", legalName: null, taxId: null });
        expect(clerk.invitations.createInvitation).toHaveBeenCalledWith({
          emailAddress: email.toLowerCase(),
          redirectUrl: "http://localhost:3000/registro",
          publicMetadata: { role: "organizer" },
          ignoreExisting: true,
        });
        expect(await getAudit(tx, result.userId)).toEqual([
          { actorId: admin.id, action: "user.invited", targetType: "user", payload: { action: "invite" } },
        ]);
      });
    });

    it("1b. un super_admin invita a un admin nuevo (sin fila de organizador)", async () => {
      await inRolledBackTransaction(async (tx) => {
        const superAdmin = await createUser(tx, { role: "super_admin" });
        const result = await inviteUser(superAdmin, { email: `admin.${randomUUID()}@example.com`, role: "admin" }, tx);
        expect((await getUser(tx, result.userId)).role).toBe("admin");
        expect(await getOrganizer(tx, result.userId)).toBeNull();
        expect(clerk.invitations.createInvitation).toHaveBeenCalledWith(expect.objectContaining({ publicMetadata: { role: "admin" } }));
      });
    });

    it("2. fila precreada sin clerk_id: actualiza el rol, audita la transición y reenvía la invitación", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const target = await createUser(tx, { email: `PRE.${randomUUID()}@example.com` });

        const result = await inviteUser(admin, { email: target.email.toLowerCase(), role: "organizer" }, tx);

        expect(result).toEqual({ userId: target.id, outcome: "reinvited" });
        expect((await getUser(tx, target.id)).role).toBe("organizer");
        expect((await getOrganizer(tx, target.id))?.status).toBe("pending");
        expect(clerk.invitations.createInvitation).toHaveBeenCalledTimes(1);
        expect(clerk.users.updateUserMetadata).not.toHaveBeenCalled();
        expect(await getAuditPayloads(tx, target.id)).toEqual(sortByJson([
          { field: "role", from: "customer", to: "organizer" },
          { field: "organizerStatus", from: null, to: "pending" },
          { action: "invite" },
        ]));
      });
    });

    it("3. usuario con cuenta de Clerk: solo cambia el rol y sincroniza publicMetadata.role, sin invitación", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const clerkId = `user_${randomUUID()}`;
        const target = await createUser(tx, { clerkId });

        const result = await inviteUser(admin, { email: target.email, role: "organizer" }, tx);

        expect(result).toEqual({ userId: target.id, outcome: "roleUpdated" });
        expect((await getUser(tx, target.id)).role).toBe("organizer");
        expect(clerk.invitations.createInvitation).not.toHaveBeenCalled();
        expect(clerk.users.updateUserMetadata).toHaveBeenCalledWith(clerkId, { publicMetadata: { role: "organizer" } });
        expect((await getAudit(tx, target.id)).map((row) => row.action).sort()).toEqual([
          "user.organizer_status_changed",
          "user.role_changed",
        ]);
      });
    });

    it.each([
      ["admin → un admin existente", "admin", "admin", "super_admin_only"],
      ["admin → un super_admin existente", "admin", "super_admin", "protected"],
      ["super_admin → otro super_admin", "super_admin", "super_admin", "protected"],
    ] as const)("4. objetivo protegido (%s): rechaza sin escribir ni llamar a Clerk", async (_case, actorRole, targetRole, code) => {
      await inRolledBackTransaction(async (tx) => {
        const actor = await createUser(tx, { role: actorRole });
        const target = await createUser(tx, { role: targetRole, clerkId: `user_${randomUUID()}` });

        expect(await errorCode(() => inviteUser(actor, { email: target.email, role: "organizer" }, tx))).toBe(code);
        expect((await getUser(tx, target.id)).role).toBe(targetRole);
        expect(await getAudit(tx, target.id)).toEqual([]);
        expect(clerk.invitations.createInvitation).not.toHaveBeenCalled();
        expect(clerk.users.updateUserMetadata).not.toHaveBeenCalled();
      });
    });

    it("4. nadie se invita a sí mismo", async () => {
      await inRolledBackTransaction(async (tx) => {
        const superAdmin = await createUser(tx, { role: "super_admin" });
        expect(await errorCode(() => inviteUser(superAdmin, { email: superAdmin.email, role: "admin" }, tx))).toBe("self");
      });
    });

    it("solo un super_admin invita con rol admin", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const email = `x.${randomUUID()}@example.com`;
        expect(await errorCode(() => inviteUser(admin, { email, role: "admin" }, tx))).toBe("super_admin_only");
        expect((await listUsers({ q: email }, tx)).total).toBe(0);
      });
    });

    it("si Clerk no envía la invitación: clerk_unavailable, la fila queda precreada y un reintento la reenvía", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const email = `retry.${randomUUID()}@example.com`;
        clerk.invitations.createInvitation.mockRejectedValueOnce(Object.assign(new Error(`fallo ${email}`), { status: 500 }));

        expect(await errorCode(() => inviteUser(admin, { email, role: "organizer" }, tx))).toBe("clerk_unavailable");
        expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(email);
        const [created] = (await listUsers({ q: email }, tx)).items;
        expect(created).toMatchObject({ role: "organizer", hasClerkAccount: false });
        // Sin invitación enviada no hay auditoría de invitación.
        expect(await getAudit(tx, created.id)).toEqual([]);

        expect(await inviteUser(admin, { email, role: "organizer" }, tx)).toEqual({ userId: created.id, outcome: "reinvited" });
        expect(clerk.invitations.createInvitation).toHaveBeenCalledTimes(2);
        expect(await getAudit(tx, created.id)).toEqual([
          { actorId: admin.id, action: "user.invited", targetType: "user", payload: { action: "invite" } },
        ]);
      });
    });

    it("si Clerk no reenvía la invitación a una fila precreada: sin auditoría de invitación (solo la del cambio de rol)", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const target = await createUser(tx);
        clerk.invitations.createInvitation.mockRejectedValueOnce(Object.assign(new Error("caído"), { status: 503 }));

        expect(await errorCode(() => inviteUser(admin, { email: target.email, role: "organizer" }, tx))).toBe(
          "clerk_unavailable",
        );
        expect((await getAudit(tx, target.id)).map((row) => row.action)).not.toContain("user.invited");
      });
    });

    it("invitación simultánea al mismo correo nuevo (insert duplicado, 23505 users_email_unique) → conflict", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const email = `race.${randomUUID()}@example.com`;
        // Simula la fila que otra invitación insertó a la vez: el SELECT … FOR UPDATE no la ve (aquí, por estar
        // anonimizada; en la carrera real, porque aún no existía) y el INSERT choca con el UNIQUE del correo.
        const other = await createUser(tx, { email });
        await tx.update(users).set({ anonymizedAt: new Date() }).where(eq(users.id, other.id));

        expect(await errorCode(() => inviteUser(admin, { email, role: "organizer" }, tx))).toBe("conflict");
        expect(clerk.invitations.createInvitation).not.toHaveBeenCalled();
        expect(await getAudit(tx, other.id)).toEqual([]);
      });
    });

    it("integración con ensureUser: el invitado se registra con el correo verificado y su fila precreada se vincula", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const email = `encadenado.${randomUUID()}@example.com`;
        const { userId } = await inviteUser(admin, { email, role: "organizer" }, tx);

        // Primer login del invitado: Clerk crea una cuenta nueva con el mismo correo, ya verificado.
        const clerkId = `user_${randomUUID()}`;
        const linked = await ensureUser({ clerkId, email: email.toUpperCase(), emailVerified: true, firstName: "Inés", lastName: "Rojas" });

        expect(linked).toMatchObject({ id: userId, email, role: "organizer", firstName: "Inés", lastName: "Rojas" });
        expect(await getUser(tx, userId)).toMatchObject({ clerkId, role: "organizer" });
        expect((await getOrganizer(tx, userId))?.status).toBe("pending");
        expect((await listUsers({ q: email }, tx)).items).toEqual([expect.objectContaining({ id: userId, hasClerkAccount: true })]);
      });
    });
  });

  describe("updateUser: reglas sobre el objetivo y el rol", () => {
    const edit = (role: UserRole) => ({ firstName: "Nuevo", lastName: "Nombre", role });

    it.each([
      ["admin → admin", "admin", "admin", "super_admin_only"],
      ["admin → super_admin", "admin", "super_admin", "protected"],
      ["super_admin → super_admin", "super_admin", "super_admin", "protected"],
    ] as const)("%s: rechaza sin escribir", async (_case, actorRole, targetRole, code) => {
      await inRolledBackTransaction(async (tx) => {
        const actor = await createUser(tx, { role: actorRole });
        const target = await createUser(tx, { role: targetRole });
        expect(await errorCode(() => updateUser(actor, target.id, edit(targetRole), tx))).toBe(code);
        expect(await getUser(tx, target.id)).toMatchObject({ firstName: target.firstName, role: targetRole });
      });
    });

    it.each(["admin", "super_admin"] as const)("un %s no se edita a sí mismo", async (role) => {
      await inRolledBackTransaction(async (tx) => {
        const actor = await createUser(tx, { role });
        expect(await errorCode(() => updateUser(actor, actor.id, edit(role), tx))).toBe("self");
      });
    });

    it("super_admin edita a un admin y lo pasa a customer", async () => {
      await inRolledBackTransaction(async (tx) => {
        const superAdmin = await createUser(tx, { role: "super_admin" });
        const target = await createUser(tx, { role: "admin" });
        await updateUser(superAdmin, target.id, edit("customer"), tx);
        expect(await getUser(tx, target.id)).toMatchObject({ firstName: "Nuevo", lastName: "Nombre", role: "customer" });
      });
    });

    it("asignar admin solo lo puede un super_admin; super_admin no se asigna desde el panel", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const superAdmin = await createUser(tx, { role: "super_admin" });
        const target = await createUser(tx);

        expect(await errorCode(() => updateUser(admin, target.id, edit("admin"), tx))).toBe("super_admin_only");
        expect(await errorCode(() => updateUser(superAdmin, target.id, edit("super_admin"), tx))).toBe("role_not_assignable");
        expect((await getUser(tx, target.id)).role).toBe("customer");

        await updateUser(superAdmin, target.id, edit("admin"), tx);
        expect((await getUser(tx, target.id)).role).toBe("admin");
      });
    });

    it("un usuario inexistente o anonimizado → not_found", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const anonymized = await createUser(tx);
        await tx.update(users).set({ anonymizedAt: new Date() }).where(eq(users.id, anonymized.id));
        expect(await errorCode(() => updateUser(admin, randomUUID(), edit("customer"), tx))).toBe("not_found");
        expect(await errorCode(() => updateUser(admin, anonymized.id, edit("customer"), tx))).toBe("not_found");
      });
    });
  });

  describe("updateUser: organizador", () => {
    it("promover a organizer crea organizers pending con los datos fiscales opcionales y audita sin PII", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const clerkId = `user_${randomUUID()}`;
        const target = await createUser(tx, { clerkId });
        const taxId = uniqueRuc();

        await updateUser(
          admin,
          target.id,
          { firstName: "Promo", lastName: "Tora", role: "organizer", organizer: { legalName: "Promo SAC", taxIdType: "ruc", taxId } },
          tx,
        );

        expect(await getOrganizer(tx, target.id)).toMatchObject({ status: "pending", legalName: "Promo SAC", taxIdType: "ruc", taxId, commissionBps: 1000 });
        expect(clerk.users.updateUserMetadata).toHaveBeenCalledWith(clerkId, { publicMetadata: { role: "organizer" } });
        const audit = await getAudit(tx, target.id);
        expect(sortByJson(audit.map((row) => row.payload))).toEqual(sortByJson([
          { field: "role", from: "customer", to: "organizer" },
          { field: "organizerStatus", from: null, to: "pending" },
        ]));
        const logged = JSON.stringify(audit);
        for (const value of [clerkId, target.email, "Promo", taxId, "87654321", "912345678"]) expect(logged).not.toContain(value);
      });
    });

    it("aprobar sin datos fiscales falla (CHECK → missing_tax_data) y no cambia nada", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const target = await createUser(tx, { role: "organizer", organizer: { status: "pending" } });

        expect(
          await errorCode(() =>
            updateUser(admin, target.id, { firstName: "A", lastName: "B", role: "organizer", organizer: { status: "approved" } }, tx),
          ),
        ).toBe("missing_tax_data");
        expect(await errorCode(() => setOrganizerStatus(admin, target.id, "approved", tx))).toBe("missing_tax_data");
        expect((await getOrganizer(tx, target.id))?.status).toBe("pending");
        expect((await getUser(tx, target.id)).firstName).toBe(target.firstName);
        expect(await getAudit(tx, target.id)).toEqual([]);
      });
    });

    it("aprobar con datos fiscales completos funciona", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const target = await createUser(tx, { role: "organizer", organizer: { status: "pending" } });
        await updateUser(
          admin,
          target.id,
          {
            firstName: "A",
            lastName: "B",
            role: "organizer",
            organizer: { legalName: "Org SAC", taxIdType: "dni", taxId: "12345678", status: "approved" },
          },
          tx,
        );
        expect(await getOrganizer(tx, target.id)).toMatchObject({ status: "approved", taxIdType: "dni", taxId: "12345678" });
        expect(await getAuditPayloads(tx, target.id)).toEqual(sortByJson([
          { field: "organizerStatus", from: "pending", to: "approved" },
        ]));
      });
    });

    it("un RUC/DNI de otro organizador → tax_id_taken", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const taxId = uniqueRuc();
        await createUser(tx, { role: "organizer", organizer: { status: "approved", fiscal: { legalName: "Uno SAC", taxIdType: "ruc", taxId } } });
        const target = await createUser(tx, { role: "organizer", organizer: { status: "pending" } });

        expect(
          await errorCode(() =>
            updateUser(admin, target.id, { firstName: "A", lastName: "B", role: "organizer", organizer: { taxIdType: "ruc", taxId } }, tx),
          ),
        ).toBe("tax_id_taken");
        expect((await getOrganizer(tx, target.id))?.taxId).toBeNull();
      });
    });

    it.each(["published", "pending_review"] as const)("quitar el rol organizer con un evento %s está bloqueado", async (status) => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const organizer = await organizerWithEvent(tx, status);

        const error = await caught(() => updateUser(admin, organizer.id, { firstName: "A", lastName: "B", role: "customer" }, tx));
        expect(error).toBeInstanceOf(UserManagementError);
        expect(error).toMatchObject({ code: "organizer_has_activity", blockers: { activeEvents: 1, pendingPayouts: 0 } });
        expect((await getUser(tx, organizer.id)).role).toBe("organizer");
        expect((await getOrganizer(tx, organizer.id))?.status).toBe("pending");
      });
    });

    it("quitar el rol organizer con un payout pending está bloqueado", async () => {
      await inRolledBackTransaction(async (tx) => {
        const superAdmin = await createUser(tx, { role: "super_admin" });
        const organizer = await organizerWithEvent(tx);
        await tx.insert(payouts).values({ organizerId: organizer.id, eventId: organizer.eventId, amountCents: 1000, currency: "PEN" });

        expect(await caught(() => updateUser(superAdmin, organizer.id, { firstName: "A", lastName: "B", role: "admin" }, tx))).toMatchObject({
          code: "organizer_has_activity",
          blockers: { activeEvents: 0, pendingPayouts: 1 },
        });
        expect((await getUser(tx, organizer.id)).role).toBe("organizer");
      });
    });

    it("sin bloqueos, quitar el rol organizer lo pasa a customer y deja su fila suspended", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const clerkId = `user_${randomUUID()}`;
        const target = await createUser(tx, { role: "organizer", clerkId, organizer: { status: "approved" } });
        const organizer = await organizerWithEvent(tx); // con un borrador: no bloquea

        await updateUser(admin, target.id, { firstName: "A", lastName: "B", role: "customer" }, tx);
        await updateUser(admin, organizer.id, { firstName: "A", lastName: "B", role: "customer" }, tx);

        expect((await getUser(tx, target.id)).role).toBe("customer");
        expect(await getOrganizer(tx, target.id)).toMatchObject({ status: "suspended", legalName: "Prueba SAC" });
        expect((await getOrganizer(tx, organizer.id))?.status).toBe("suspended");
        expect(clerk.users.updateUserMetadata).toHaveBeenCalledWith(clerkId, { publicMetadata: { role: "customer" } });
        expect(await getAuditPayloads(tx, target.id)).toEqual(sortByJson([
          { field: "role", from: "organizer", to: "customer" },
          { field: "organizerStatus", from: "approved", to: "suspended" },
        ]));
      });
    });

    it("volver a promover a un organizador suspendido lo deja pending", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const target = await createUser(tx, { organizer: { status: "suspended" } });
        await updateUser(admin, target.id, { firstName: "A", lastName: "B", role: "organizer" }, tx);
        expect((await getOrganizer(tx, target.id))?.status).toBe("pending");
      });
    });

    it("sin cambio de rol no sincroniza Clerk; si Clerk falla al sincronizar, la BD manda y no lanza", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const target = await createUser(tx, { clerkId: `user_${randomUUID()}` });

        await updateUser(admin, target.id, { firstName: "Solo", lastName: "Nombre", role: "customer" }, tx);
        expect(clerk.users.updateUserMetadata).not.toHaveBeenCalled();
        expect(await getAudit(tx, target.id)).toEqual([]);

        clerk.users.updateUserMetadata.mockRejectedValueOnce(new Error("Clerk caído"));
        await expect(updateUser(admin, target.id, { firstName: "A", lastName: "B", role: "organizer" }, tx)).resolves.toBeUndefined();
        expect((await getUser(tx, target.id)).role).toBe("organizer");
      });
    });
  });

  describe("setOrganizerStatus", () => {
    it("aprueba y suspende, auditando cada transición", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const target = await createUser(tx, {
          role: "organizer",
          organizer: { status: "pending", fiscal: { legalName: "Org SAC", taxIdType: "ruc", taxId: uniqueRuc() } },
        });

        await setOrganizerStatus(admin, target.id, "approved", tx);
        expect((await getOrganizer(tx, target.id))?.status).toBe("approved");
        await setOrganizerStatus(admin, target.id, "suspended", tx);
        expect((await getOrganizer(tx, target.id))?.status).toBe("suspended");
        expect(await getAuditPayloads(tx, target.id)).toEqual(sortByJson([
          { field: "organizerStatus", from: "pending", to: "approved" },
          { field: "organizerStatus", from: "approved", to: "suspended" },
        ]));
      });
    });

    it("rechaza a quien no es organizador y aplica las reglas sobre el objetivo", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const customer = await createUser(tx);
        const otherAdmin = await createUser(tx, { role: "admin" });
        expect(await errorCode(() => setOrganizerStatus(admin, customer.id, "approved", tx))).toBe("not_organizer");
        expect(await errorCode(() => setOrganizerStatus(admin, otherAdmin.id, "approved", tx))).toBe("super_admin_only");
      });
    });
  });

  describe("deleteUser", () => {
    it("borra en Clerk, anonimiza la fila, suspende al organizador y audita sin PII ni clerk_id", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const clerkId = `user_${randomUUID()}`;
        const target = await createUser(tx, { role: "organizer", clerkId, organizer: { status: "approved" } });
        const organizerBefore = await getOrganizer(tx, target.id);

        await deleteUser(admin, target.id, tx);

        expect(clerk.users.deleteUser).toHaveBeenCalledWith(clerkId);
        const row = await getUser(tx, target.id);
        expect(row).toMatchObject({
          clerkId: null,
          email: expect.stringMatching(/^deleted\+[0-9a-f-]{36}@anon\.invalid$/),
          firstName: "Usuario",
          lastName: "Eliminado",
          phone: null,
          documentType: null,
          documentNumber: null,
          anonymizedAt: expect.any(Date),
        });
        expect((await getOrganizer(tx, target.id))?.status).toBe("suspended");
        const audit = await getAudit(tx, target.id);
        expect(audit).toEqual(
          sortByJson([
            { actorId: admin.id, action: "user.organizer_status_changed", targetType: "user", payload: { field: "organizerStatus", from: "approved", to: "suspended" } },
            { actorId: admin.id, action: "user.deleted", targetType: "user", payload: { action: "delete" } },
          ]),
        );
        const logged = JSON.stringify(audit);
        for (const value of [clerkId, target.email, target.lastName, organizerBefore?.taxId ?? "-", "87654321"]) {
          expect(logged).not.toContain(value);
        }
        expect((await listUsers({ q: target.lastName }, tx)).total).toBe(0);
      });
    });

    it("si Clerk falla no toca la BD; el reintento completa", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const clerkId = `user_${randomUUID()}`;
        const target = await createUser(tx, { clerkId });
        clerk.users.deleteUser.mockRejectedValueOnce(Object.assign(new Error(`Clerk caído ${clerkId}`), { status: 503 }));

        expect(await errorCode(() => deleteUser(admin, target.id, tx))).toBe("clerk_unavailable");
        expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(clerkId);
        expect(await getUser(tx, target.id)).toMatchObject({ clerkId, email: target.email, anonymizedAt: null });
        expect(await getAudit(tx, target.id)).toEqual([]);

        await deleteUser(admin, target.id, tx);
        expect(clerk.users.deleteUser).toHaveBeenCalledTimes(2);
        expect(await getUser(tx, target.id)).toMatchObject({ clerkId: null, firstName: "Usuario" });
      });
    });

    it("un 404 de Clerk (ya borrado, p. ej. tras un fallo de BD) cuenta como éxito", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const target = await createUser(tx, { clerkId: `user_${randomUUID()}` });
        clerk.users.deleteUser.mockRejectedValueOnce(Object.assign(new Error("Not Found"), { status: 404 }));

        await deleteUser(admin, target.id, tx);
        expect(await getUser(tx, target.id)).toMatchObject({ clerkId: null, anonymizedAt: expect.any(Date) });
      });
    });

    it("sin cuenta de Clerk (invitado) anonimiza sin llamar a Clerk; una 2.ª vez → not_found", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const target = await createUser(tx);
        await deleteUser(admin, target.id, tx);
        expect(clerk.users.deleteUser).not.toHaveBeenCalled();
        expect(await errorCode(() => deleteUser(admin, target.id, tx))).toBe("not_found");
      });
    });

    it("bloqueado para un organizador con eventos activos, sin llamar a Clerk", async () => {
      await inRolledBackTransaction(async (tx) => {
        const admin = await createUser(tx, { role: "admin" });
        const organizer = await organizerWithEvent(tx, "published");
        await tx.update(users).set({ clerkId: `user_${randomUUID()}` }).where(eq(users.id, organizer.id));

        expect(await errorCode(() => deleteUser(admin, organizer.id, tx))).toBe("organizer_has_activity");
        expect(clerk.users.deleteUser).not.toHaveBeenCalled();
        expect((await getUser(tx, organizer.id)).anonymizedAt).toBeNull();
      });
    });

    it.each([
      ["a sí mismo", "admin", null, "self"],
      ["admin → admin", "admin", "admin", "super_admin_only"],
      ["super_admin → super_admin", "super_admin", "super_admin", "protected"],
    ] as const)("aplica las reglas sobre el objetivo (%s)", async (_case, actorRole, targetRole, code) => {
      await inRolledBackTransaction(async (tx) => {
        const actor = await createUser(tx, { role: actorRole, clerkId: `user_${randomUUID()}` });
        const target = targetRole ? await createUser(tx, { role: targetRole, clerkId: `user_${randomUUID()}` }) : actor;
        expect(await errorCode(() => deleteUser(actor, target.id, tx))).toBe(code);
        expect(clerk.users.deleteUser).not.toHaveBeenCalled();
      });
    });
  });
});
