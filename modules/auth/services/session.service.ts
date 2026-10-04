import "server-only";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { SessionUser } from "../types/auth.types";
import { AccountLinkError, ensureUser, findUserByClerkId } from "./users.service";

/**
 * Usuario de la sesión (fila de `users`) o `null` sin sesión. Con fila existente solo lee `auth()`; la primera vez
 * pide el usuario a Clerk, crea o vincula la fila y replica su rol en `publicMetadata.role` si difiere.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await findUserByClerkId(userId);
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;
  const primaryEmail = clerkUser.primaryEmailAddress;
  if (!primaryEmail) throw new AccountLinkError("La cuenta no tiene un correo principal");

  const user = await ensureUser({
    clerkId: userId,
    email: primaryEmail.emailAddress,
    emailVerified: primaryEmail.verification?.status === "verified",
    firstName: clerkUser.firstName ?? "",
    lastName: clerkUser.lastName ?? "",
  });
  if (clerkUser.publicMetadata.role !== user.role) {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, { publicMetadata: { role: user.role } });
  }
  return user;
}

/** Usuario de la sesión para páginas y layouts privados; sin sesión redirige a `/login`. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
