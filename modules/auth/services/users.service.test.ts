// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/identity";
import { describeWithDb } from "@/lib/db/testDb";
import type { ClerkIdentity } from "../types/auth.types";
import { AccountLinkError, ensureUser, findUserByClerkId } from "./users.service";

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
});
