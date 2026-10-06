"use client";

import { useState, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const BUTTON_CLASS = "h-11 cursor-pointer px-4 font-semibold";

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  /** Texto del botón de confirmar y el que muestra mientras se ejecuta ("Eliminar" / "Eliminando…"). */
  confirmLabel: string;
  pendingLabel: string;
  /** Texto del botón que cierra sin hacer nada. */
  cancelLabel?: string;
  /** Acción destructiva: botón rojo con texto navy (rojo con blanco no llega a 4.5:1, MASTER §2). */
  destructive?: boolean;
  /**
   * Ejecuta la acción. Devuelve `null` si fue bien (quien llama cierra el diálogo) o el mensaje de error, que se muestra
   * aquí con el diálogo abierto para reintentar.
   */
  onConfirm: () => Promise<string | null>;
  /** Mensaje si `onConfirm` lanza (fallo de red o del servidor). */
  genericError: string;
};

/**
 * Confirmación de una acción (`AlertDialog`, `p-5`, título `text-xl font-bold`, pie a sangre con Cancelar outline y la
 * acción, ambos de 44 px). Mientras se ejecuta, los dos botones quedan deshabilitados y la acción muestra un `Spinner`.
 */
export function ConfirmDialog({ open, onOpenChange, ...props }: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="gap-5 p-5">
        {/* Dentro del popup: se desmonta al cerrar y cada apertura empieza sin el error anterior. */}
        <ConfirmDialogBody {...props} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ConfirmDialogBody({
  title,
  description,
  confirmLabel,
  pendingLabel,
  cancelLabel = "Cancelar",
  destructive = false,
  onConfirm,
  genericError,
}: Omit<ConfirmDialogProps, "open" | "onOpenChange">) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    setPending(true);
    try {
      setError(await onConfirm());
    } catch {
      setError(genericError);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="text-xl font-bold">{title}</AlertDialogTitle>
        <AlertDialogDescription className="text-base">{description}</AlertDialogDescription>
      </AlertDialogHeader>
      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}
      <AlertDialogFooter className="-mx-5 -mb-5 p-5">
        <AlertDialogCancel className={BUTTON_CLASS} disabled={pending}>
          {cancelLabel}
        </AlertDialogCancel>
        <AlertDialogAction
          className={cn(
            BUTTON_CLASS,
            "duration-200",
            destructive ? "bg-destructive text-foreground hover:bg-destructive/90" : "hover:bg-primary-strong",
          )}
          disabled={pending}
          onClick={handleConfirm}
        >
          {pending && <Spinner aria-hidden className="motion-reduce:animate-none" />}
          {pending ? pendingLabel : confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
