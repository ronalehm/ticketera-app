import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/identity";
import type { ClerkIdentity, SessionUser } from "../types/auth.types";
import { getAccountLinkAction } from "../utils/getAccountLinkAction";

/** El usuario de Clerk no se puede enlazar con la fila que ya tiene su correo. No se escribe nada. */
export class AccountLinkError extends Error {
  override name = "AccountLinkError";
}

const SESSION_USER_COLUMNS = {
  id: users.id,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  phone: users.phone,
  documentType: users.documentType,
  documentNumber: users.documentNumber,
  role: users.role,
  createdAt: users.createdAt,
};

/** Fila de `users` del usuario; `mfaVerified` lo añade `getSessionUser` desde la sesión. */
type UserRow = Omit<SessionUser, "mfaVerified">;

type Queryable = Pick<typeof db, "select">;

export async function findUserByClerkId(clerkId: string, database: Queryable = db): Promise<UserRow | null> {
  const [user] = await database.select(SESSION_USER_COLUMNS).from(users).where(eq(users.clerkId, clerkId));
  return user ?? null;
}

/**
 * Fila de `users` del usuario de Clerk: la suya, la del mismo correo sin `clerk_id` (vinculada si el correo está
 * verificado) o una nueva `customer`. Lanza `AccountLinkError` si el correo pertenece a otra cuenta o no está verificado.
 */
export async function ensureUser(identity: ClerkIdentity, database = db): Promise<UserRow> {
  const email = identity.email.toLowerCase();

  return database.transaction(async (tx) => {
    const own = await findUserByClerkId(identity.clerkId, tx);
    if (own) return own;

    const [existing] = await tx
      .select({ id: users.id, clerkId: users.clerkId })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`);
    const action = getAccountLinkAction(existing, identity.emailVerified);

    if (action === "reject-unverified") {
      throw new AccountLinkError("Verifica tu correo para acceder a la cuenta existente");
    }
    if (action === "reject-conflict") {
      throw new AccountLinkError("El correo ya pertenece a otra cuenta");
    }

    // Aquí `existing` solo existe si la acción es "link": toma los nombres de Clerk (un "" deja el de la fila;
    // Drizzle omite las claves `undefined`).
    const [written] = existing
      ? await tx
          .update(users)
          .set({
            clerkId: identity.clerkId,
            firstName: identity.firstName || undefined,
            lastName: identity.lastName || undefined,
          })
          .where(and(eq(users.id, existing.id), isNull(users.clerkId)))
          .returning(SESSION_USER_COLUMNS)
      : await tx
          .insert(users)
          .values({ clerkId: identity.clerkId, email, firstName: identity.firstName, lastName: identity.lastName })
          .onConflictDoNothing()
          .returning(SESSION_USER_COLUMNS);
    if (written) return written;

    // Otra request la creó o la vinculó a la vez (primeras requests simultáneas del mismo usuario).
    const concurrent = await findUserByClerkId(identity.clerkId, tx);
    if (!concurrent) throw new AccountLinkError("El correo ya pertenece a otra cuenta");
    return concurrent;
  });
}
