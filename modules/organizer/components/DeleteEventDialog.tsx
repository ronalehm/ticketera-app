"use client";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { ManagedEvent } from "@/modules/events";

import { useDeleteEventDraft } from "../hooks/useEventDrafts";
import { EVENT_DRAFT_GENERIC_ERROR } from "../utils/eventDraftError";

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
  const remove = useDeleteEventDraft(userId);

  async function handleConfirm() {
    if (!event) return null;
    const result = await remove.mutateAsync(event.id);
    if (!result.ok) return result.error;
    onDeleted(event.title);
    return null;
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`¿Eliminar el borrador «${event?.title ?? ""}»?`}
      description="Se borran el evento y sus tipos de entrada. Esta acción no se puede deshacer."
      confirmLabel="Eliminar"
      pendingLabel="Eliminando…"
      destructive
      onConfirm={handleConfirm}
      genericError={EVENT_DRAFT_GENERIC_ERROR}
    />
  );
}
