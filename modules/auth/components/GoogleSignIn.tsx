"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { INLINE_LINK } from "@/lib/linkStyles";
import { GOOGLE_DEMO_ACCOUNT } from "../data/googleAccount.mock";
import { signInWithGoogle } from "../services/googleAuth.service";
import { useAuthStore } from "../stores/auth.store";
import { GENERIC_ERROR } from "./formShared";
import { GoogleAccountChooser } from "./GoogleAccountChooser";
import { GoogleLogo } from "./GoogleLogo";

const CANCELLED_ERROR = "Cancelaste el inicio de sesión con Google. Puedes intentarlo de nuevo.";
const CONNECTING_LABEL = "Conectando con Google…";

type Status = "idle" | "choosing" | "connecting";

/** Acceso con Google simulado: botón, aviso de aceptación, selector de cuenta y estados recuperables. */
export function GoogleSignIn() {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const isConnecting = status === "connecting";

  function handleOpen() {
    if (status !== "idle") return;
    setError(null);
    setStatus("choosing");
  }

  // Solo se llama al cerrar por interacción (Cancelar, Escape o clic fuera): equivale a cancelar.
  function handleOpenChange(open: boolean) {
    if (open) return;
    setStatus("idle");
    setError(CANCELLED_ERROR);
  }

  async function handleSelect() {
    setStatus("connecting");
    try {
      signIn(await signInWithGoogle());
      router.replace("/");
    } catch {
      setStatus("idle");
      setError(GENERIC_ERROR);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleOpen}
        disabled={isConnecting}
        // Solo mientras conecta: Base UI pondría aria-disabled="false" en reposo.
        focusableWhenDisabled={isConnecting}
        aria-busy={isConnecting || undefined}
        className="h-11 w-full cursor-pointer gap-2.5 rounded-lg border-muted-foreground bg-background font-medium text-foreground duration-200 hover:bg-accent aria-busy:cursor-progress aria-busy:opacity-70"
      >
        {isConnecting ? (
          <>
            <Spinner aria-hidden className="motion-reduce:animate-none" />
            {CONNECTING_LABEL}
          </>
        ) : (
          <>
            <GoogleLogo className="size-4.5 shrink-0" />
            Continuar con Google
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Al continuar con Google, aceptas los{" "}
        <Link href="/terminos" target="_blank" rel="noopener noreferrer" className={INLINE_LINK}>
          Términos y condiciones
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" target="_blank" rel="noopener noreferrer" className={INLINE_LINK}>
          Política de privacidad
        </Link>
        , y autorizas la{" "}
        <Link
          href="/privacidad#transferencia-internacional"
          target="_blank"
          rel="noopener noreferrer"
          className={INLINE_LINK}
        >
          transferencia internacional de tus datos
        </Link>{" "}
        a proveedores fuera del Perú.
      </p>

      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      <p role="status" className="sr-only">
        {isConnecting ? CONNECTING_LABEL : null}
      </p>

      <GoogleAccountChooser
        open={status === "choosing"}
        onOpenChange={handleOpenChange}
        onSelect={handleSelect}
        account={GOOGLE_DEMO_ACCOUNT}
      />
    </div>
  );
}
