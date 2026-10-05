import "server-only";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { SessionUser } from "../types/auth.types";
import { type Action, can, isMfaPending } from "../utils/can";
import { isProfileComplete } from "../utils/isProfileComplete";
import { AccountLinkError, ensureUser, findUserByClerkId } from "./users.service";

/**
 * Usuario de la sesión (fila de `users` + `mfaVerified`) o `null` sin sesión. Con fila existente solo lee `auth()`; la
 * primera vez pide el usuario a Clerk, crea o vincula la fila y replica su rol en `publicMetadata.role` si difiere.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  return (await loadSession())?.user ?? null;
}

/**
 * Replica el rol de la BD (`users.role`) en `publicMetadata.role` de Clerk si difiere, p. ej. tras cambiarlo por seed o
 * SQL. Devuelve `changed: true` solo si escribió. Sin sesión o con el rol al día no escribe nada.
 */
export async function syncClerkRole(): Promise<{ changed: boolean }> {
  const session = await loadSession();
  if (!session) return { changed: false };
  // Fila recién creada o vinculada: `findOrCreateUser` ya comparó el rol con Clerk.
  if (session.roleSync) return session.roleSync;

  const clerkUser = await currentUser();
  if (!clerkUser) return { changed: false };
  return { changed: await replicateRole(clerkUser.id, clerkUser.publicMetadata.role, session.user.role) };
}

/** Resultado de replicar el rol en Clerk; `null` si no se comparó (la fila ya existía). */
type RoleSync = { changed: boolean } | null;

async function loadSession(): Promise<{ user: SessionUser; roleSync: RoleSync } | null> {
  const { userId, factorVerificationAge } = await auth();
  if (!userId) return null;

  const result = await findOrCreateUser(userId);
  if (!result) return null;
  // `factorVerificationAge` = [primer factor, segundo factor] en minutos; -1 si la sesión no usó ese factor.
  return { ...result, user: { ...result.user, mfaVerified: (factorVerificationAge?.[1] ?? -1) >= 0 } };
}

async function findOrCreateUser(
  userId: string,
): Promise<{ user: Omit<SessionUser, "mfaVerified">; roleSync: RoleSync } | null> {
  const existing = await findUserByClerkId(userId);
  if (existing) return { user: existing, roleSync: null };

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
  return { user, roleSync: { changed: await replicateRole(userId, clerkUser.publicMetadata.role, user.role) } };
}

/** Escribe `role` en `publicMetadata.role` del usuario de Clerk si `clerkRole` difiere; devuelve si escribió. */
async function replicateRole(clerkId: string, clerkRole: unknown, role: SessionUser["role"]): Promise<boolean> {
  if (clerkRole === role) return false;
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkId, { publicMetadata: { role } });
  return true;
}

/**
 * Correo principal de la sesión de Clerk en minúsculas si Clerk lo marca como verificado; `null` sin sesión, sin
 * correo principal o sin verificar. Base para asociar las compras de invitado (`buyer_email`) a la cuenta.
 */
export async function getVerifiedEmail(): Promise<string | null> {
  const primaryEmail = (await currentUser())?.primaryEmailAddress;
  return primaryEmail?.verification?.status === "verified" ? primaryEmail.emailAddress.toLowerCase() : null;
}

/**
 * Usuario de la sesión para páginas y layouts privados (Decisión 10): sin sesión redirige a `/login`; un rol con MFA
 * sin segundo factor en la sesión, a `/perfil/seguridad`; con el perfil incompleto (sin celular o documento), a
 * `/perfil/completar?redirect_url=<returnTo>`, salvo con `allowIncompleteProfile` (la propia página de completar).
 */
export async function requireUser(
  options: { returnTo?: string; allowIncompleteProfile?: boolean } = {},
): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isMfaPending(user)) redirect("/perfil/seguridad");
  if (!isProfileComplete(user) && !options.allowIncompleteProfile) {
    redirect(
      options.returnTo
        ? `/perfil/completar?${new URLSearchParams({ redirect_url: options.returnTo })}`
        : "/perfil/completar",
    );
  }
  return user;
}

/**
 * Usuario de la sesión con permiso para `action` (`requireUser` + `can`). Sin el permiso redirige al panel si el rol
 * tiene `panel:access` (p. ej. un organizador en `/admin`) y, si no, a la home.
 */
export async function requirePermission(action: Action, options: { returnTo?: string } = {}): Promise<SessionUser> {
  const user = await requireUser({ returnTo: options.returnTo });
  if (!can(user, action)) redirect(can(user, "panel:access") ? "/organizador" : "/");
  return user;
}
