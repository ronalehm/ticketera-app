"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import type { SessionIdentity } from "../types/auth.types";

/** Sesión de Clerk en el cliente: nombre, apellido y correo primario ("" si faltan). */
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
        }
      : null,
    signOut: () => clerk.signOut({ redirectUrl: "/" }),
  };
}
