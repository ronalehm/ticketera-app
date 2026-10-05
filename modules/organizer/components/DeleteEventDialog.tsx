"use client";

import { useState } from "react";
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
import type { ManagedEvent } from "@/modules/events";

import { useDeleteEventDraft } from "../hooks/useEventDrafts";
import { EVENT_DRAFT_GENERIC_ERROR } from "../utils/eventDraftError";

const BUTTON_CLASS = "h-11 cursor-pointer px-4 font-semibold";

type DeleteEventDialogProps = {
  userId: string;
  /** Borrador que se elimina; se conserva al cerrar para la animación de salida. */
  event: Pick<ManagedEvent, "id" | "title"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Eliminado; `title` es el nombre del borrador. */
  onDeleted: (title: string) => void;
};

/** Confirmación de eliminar un borrador. Si falla, el error se muestra aquí y se puede reintentar. */
export function DeleteEventDialog({ userId, event, open, onOpenChange, onDeleted }: DeleteEventDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="gap-5 p-5">
        {/* Dentro del popup: se desmonta al cerrar y cada apertura empieza sin el error anterior. */}
        {event && <DeleteEventConfirm userId={userId} event={event} onDeleted={onDeleted} />}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteEventConfirm({
  userId,
  event,
  onDeleted,
}: Pick<DeleteEventDialogProps, "userId" | "onDeleted"> & { event: Pick<ManagedEvent, "id" | "title"> }) {
  const remove = useDeleteEventDraft(userId);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    try {
      const result = await remove.mutateAsync(event.id);
      if (result.ok) onDeleted(event.title);
      else setError(result.error);
    } catch {
      setError(EVENT_DRAFT_GENERIC_ERROR);
    }
  }

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="text-xl font-bold">¿Eliminar el borrador «{event.title}»?</AlertDialogTitle>
        <AlertDialogDescription className="text-base">
          Se borran el evento y sus tipos de entrada. Esta acción no se puede deshacer.
        </AlertDialogDescription>
      </AlertDialogHeader>
      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}
      <AlertDialogFooter className="-mx-5 -mb-5 p-5">
        <AlertDialogCancel className={BUTTON_CLASS} disabled={remove.isPending}>
          Cancelar
        </AlertDialogCancel>
        <AlertDialogAction
          className={cn(BUTTON_CLASS, "bg-destructive text-foreground hover:bg-destructive/90")}
          disabled={remove.isPending}
          onClick={handleConfirm}
        >
          {remove.isPending && <Spinner aria-hidden className="motion-reduce:animate-none" />}
          {remove.isPending ? "Eliminando…" : "Eliminar"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
