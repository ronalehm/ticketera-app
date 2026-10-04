// @vitest-environment node
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/identity";
import { consents, legalDocuments } from "@/lib/db/schema/legal";
import { describeWithDb } from "@/lib/db/testDb";
import type { ClerkIdentity, CompleteProfileInput } from "../types/auth.types";
import { AccountLinkError, completeProfile, ensureUser, findUserByClerkId } from "./users.service";

/** Correos de este archivo, para limpiarlos al final sin depender del seed. */
const emails: string[] = [];

function uniqueEmail() {
  const email = `auth.${randomUUID()}@example.com`;
  emails.push(email);
  return email;
}

function identity(overrides: Partial<ClerkIdentity> = {}): ClerkIdentity {
  return {
    clerkId: `user_test_${randomUUID()}`,
    email: uniqueEmail(),
    emailVerified: true,
    firstName: "Ana",
    lastName: "Pérez",
    ...overrides,
  };
}

async function insertUser(values: { email: string; clerkId: string | null; role: "customer" | "super_admin" }) {
  const [row] = await db
    .insert(users)
    .values({ ...values, firstName: "Super", lastName: "Admin" })
    .returning();
  return row;
}

const rowByEmail = async (email: string) => (await db.select().from(users).where(eq(users.email, email)))[0];

describeWithDb("users.service (Postgres)", () => {
  afterAll(async () => {
    const ids = db.select({ id: users.id }).from(users).where(inArray(users.email, emails));
    await db.delete(consents).where(inArray(consents.userId, ids));
    await db.delete(users).where(inArray(users.email, emails));
  });

  it("crea una fila customer con el clerk_id, el correo en minúsculas y los nombres; la segunda llamada no duplica", async () => {
    const email = uniqueEmail();
    const input = identity({ email: email.toUpperCase() });

    const created = await ensureUser(input);
    expect(created).toMatchObject({ email, firstName: "Ana", lastName: "Pérez", role: "customer", phone: null });
    expect(await rowByEmail(email)).toMatchObject({ id: created.id, clerkId: input.clerkId });

    expect(await ensureUser(input)).toEqual(created);
    expect(await db.select().from(users).where(eq(users.clerkId, input.clerkId))).toHaveLength(1);
    expect(await findUserByClerkId(input.clerkId)).toEqual(created);
  });

  it("vincula la fila sin clerk_id del mismo correo (otras mayúsculas) si está verificado, conservando id y rol", async () => {
    const seeded = await insertUser({ email: uniqueEmail(), clerkId: null, role: "super_admin" });
    const input = identity({ email: seeded.email.toUpperCase() });

    const linked = await ensureUser(input);
    expect(linked).toMatchObject({ id: seeded.id, role: "super_admin", email: seeded.email });
    expect(await rowByEmail(seeded.email)).toMatchObject({ id: seeded.id, clerkId: input.clerkId, role: "super_admin" });
  });

  it("al vincular guarda el nombre y el apellido de Clerk; si Clerk trae uno vacío conserva el de la fila", async () => {
    const full = await insertUser({ email: uniqueEmail(), clerkId: null, role: "super_admin" });
    expect(await ensureUser(identity({ email: full.email }))).toMatchObject({ firstName: "Ana", lastName: "Pérez" });
    expect(await rowByEmail(full.email)).toMatchObject({ firstName: "Ana", lastName: "Pérez" });

    const partial = await insertUser({ email: uniqueEmail(), clerkId: null, role: "super_admin" });
    await ensureUser(identity({ email: partial.email, firstName: "Ana", lastName: "" }));
    expect(await rowByEmail(partial.email)).toMatchObject({ firstName: "Ana", lastName: "Admin" });
  });

  it("no vincula si el correo no está verificado: lanza AccountLinkError y la fila no cambia", async () => {
    const seeded = await insertUser({ email: uniqueEmail(), clerkId: null, role: "super_admin" });

    await expect(ensureUser(identity({ email: seeded.email, emailVerified: false }))).rejects.toThrow(AccountLinkError);
    expect(await rowByEmail(seeded.email)).toEqual(seeded);
  });

  it("lanza AccountLinkError si el correo ya tiene otro clerk_id y la fila no cambia", async () => {
    const other = await insertUser({ email: uniqueEmail(), clerkId: `user_test_${randomUUID()}`, role: "customer" });

    await expect(ensureUser(identity({ email: other.email }))).rejects.toThrow(AccountLinkError);
    expect(await rowByEmail(other.email)).toEqual(other);
  });

  it("findUserByClerkId devuelve null si no hay fila", async () => {
    expect(await findUserByClerkId(`user_test_${randomUUID()}`)).toBeNull();
  });

  describe("completeProfile", () => {
    const PROFILE: CompleteProfileInput = {
      phone: "912345678",
      documentType: "ce",
      documentNumber: "001234567",
      acceptTerms: true,
      marketingOptIn: false,
    };
    const META = { ip: "203.0.113.7", userAgent: "vitest" };
    const consentsOf = (userId: string) =>
      db
        .select({
          kind: legalDocuments.kind,
          legalDocumentId: consents.legalDocumentId,
          accepted: consents.accepted,
          ip: consents.ip,
          userAgent: consents.userAgent,
        })
        .from(consents)
        .innerJoin(legalDocuments, eq(consents.legalDocumentId, legalDocuments.id))
        .where(eq(consents.userId, userId));

    /** Versión vigente de un `kind`: la última publicada. */
    async function currentVersionId(kind: (typeof legalDocuments.kind.enumValues)[number]) {
      const [document] = await db
        .select({ id: legalDocuments.id })
        .from(legalDocuments)
        .where(and(eq(legalDocuments.kind, kind), eq(legalDocuments.status, "published")))
        .orderBy(desc(legalDocuments.publishedAt))
        .limit(1);
      return document.id;
    }

    it("guarda celular y documento y las 4 filas de consents con la versión vigente de cada kind", async () => {
      const user = await insertUser({ email: uniqueEmail(), clerkId: null, role: "customer" });

      await completeProfile(user.id, { ...PROFILE, marketingOptIn: true }, META);

      expect(await rowByEmail(user.email)).toMatchObject({
        phone: "912345678",
        documentType: "ce",
        documentNumber: "001234567",
      });
      const rows = await consentsOf(user.id);
      expect(rows).toHaveLength(4);
      for (const kind of ["terms", "privacy", "international_transfer", "marketing"] as const) {
        expect(rows.find((row) => row.kind === kind)).toEqual({
          kind,
          legalDocumentId: await currentVersionId(kind),
          accepted: true,
          ip: "203.0.113.7",
          userAgent: "vitest",
        });
      }
    });

    it("guarda marketing con accepted = false si no se eligió la publicidad", async () => {
      const user = await insertUser({ email: uniqueEmail(), clerkId: null, role: "customer" });

      await completeProfile(user.id, PROFILE, { ip: null, userAgent: null });

      const rows = await consentsOf(user.id);
      expect(rows.find((row) => row.kind === "marketing")).toMatchObject({ accepted: false, ip: null });
      expect(rows.filter((row) => row.accepted)).toHaveLength(3);
    });

    it("si falla la escritura no guarda nada (transacción)", async () => {
      const user = await insertUser({ email: uniqueEmail(), clerkId: null, role: "customer" });

      // `ip` no es un inet válido: el insert de consents falla después del update de users.
      await expect(completeProfile(user.id, PROFILE, { ip: "no-es-ip", userAgent: null })).rejects.toThrow();

      expect(await rowByEmail(user.email)).toEqual(user);
      expect(await consentsOf(user.id)).toHaveLength(0);
    });

    it("si falta una versión publicada lanza un error y no escribe nada", async () => {
      const user = await insertUser({ email: uniqueEmail(), clerkId: null, role: "customer" });

      // Despublica marketing dentro de una transacción que se revierte al fallar (no afecta a otros tests).
      await expect(
        db.transaction(async (tx) => {
          await tx.update(legalDocuments).set({ status: "draft" }).where(eq(legalDocuments.kind, "marketing"));
          await completeProfile(user.id, PROFILE, META, tx);
        }),
      ).rejects.toThrow('No hay una versión publicada de "marketing"');

      expect(await rowByEmail(user.email)).toEqual(user);
      expect(await consentsOf(user.id)).toHaveLength(0);
    });
  });
});
