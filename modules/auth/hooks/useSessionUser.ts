"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { syncSessionRoleAction } from "../actions/session.actions";
import type { SessionIdentity, SessionUser } from "../types/auth.types";

const ROLES: readonly SessionUser["role"][] = ["customer", "organizer", "admin", "super_admin"];

/** Usuarios de Clerk cuyo rol ya se sincronizó con la BD en esta carga de página (en memoria, no persiste). */
const syncedUserIds = new Set<string>();

/** Rol de `publicMetadata.role`; cualquier otro valor (o ausente) cuenta como `customer`. */
function toSessionRole(value: unknown): SessionUser["role"] {
  return ROLES.find((role) => role === value) ?? "customer";
}

/**
 * Sesión de Clerk en el cliente: nombre, apellido y correo primario ("" si faltan) y el rol de `publicMetadata`.
 * Una vez por usuario y carga de página pide al servidor replicar el rol de la BD en Clerk y, si cambió, recarga el
 * usuario.
 */
export function useSessionUser(): {
  isLoaded: boolean;
  user: SessionIdentity | null;
  signOut: () => Promise<void>;
} {
  const { isLoaded, user } = useUser();
  const clerk = useClerk();

  useEffect(() => {
    if (!isLoaded || !user || syncedUserIds.has(user.id)) return;
    syncedUserIds.add(user.id);
    // Best effort: si falla, el menú sigue con el rol que ya tiene Clerk; la autorización la decide el servidor.
    syncSessionRoleAction()
      .then(({ changed }) => (changed ? user.reload() : undefined))
      .catch(() => {});
  }, [isLoaded, user]);

  return {
    isLoaded,
    user: user
      ? {
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          email: user.primaryEmailAddress?.emailAddress ?? "",
          role: toSessionRole(user.publicMetadata?.role),
        }
      : null,
    signOut: () => clerk.signOut({ redirectUrl: "/" }),
  };
}
