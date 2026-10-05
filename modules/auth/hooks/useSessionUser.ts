"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import type { SessionIdentity, SessionUser } from "../types/auth.types";

const ROLES: readonly SessionUser["role"][] = ["customer", "organizer", "admin", "super_admin"];

/** Rol de `publicMetadata.role`; cualquier otro valor (o ausente) cuenta como `customer`. */
function toSessionRole(value: unknown): SessionUser["role"] {
  return ROLES.find((role) => role === value) ?? "customer";
}

/** Sesión de Clerk en el cliente: nombre, apellido y correo primario ("" si faltan) y el rol de `publicMetadata`. */
export function useSessionUser(): {
  isLoaded: boolean;
  user: SessionIdentity | null;
  signOut: () => Promise<void>;
} {
  const { isLoaded, user } = useUser();
  const clerk = useClerk();

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
