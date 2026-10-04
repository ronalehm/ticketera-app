import { UserProfile as ClerkUserProfile } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { SessionUser } from "../types/auth.types";
import { isMfaPending } from "../utils/can";

/** Página "Seguridad": aviso de MFA para los roles que lo exigen + `<UserProfile/>` de Clerk. */
export function AccountSecurity({ user }: { user: Pick<SessionUser, "role" | "mfaVerified"> }) {
  return (
    <section className="bg-muted">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:gap-8 md:px-6 md:py-12">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">Seguridad</h1>
        {isMfaPending(user) && (
          <Alert className="px-4 py-3">
            <ShieldAlert aria-hidden />
            <AlertTitle className="font-bold">Verificación en dos pasos obligatoria</AlertTitle>
            <AlertDescription>
              Tu rol requiere verificación en dos pasos: actívala y vuelve a iniciar sesión.
            </AlertDescription>
          </Alert>
        )}
        <ClerkUserProfile routing="hash" />
      </div>
    </section>
  );
}
