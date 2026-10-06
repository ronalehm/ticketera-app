"use client";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { ManagedEvent } from "@/modules/events";

import { useModerateEvent } from "../hooks/useEventModeration";
import { EVENT_DRAFT_GENERIC_ERROR } from "../utils/eventDraftError";
import { DeleteEventDialog } from "./DeleteEventDialog";
import type { EventRowAction } from "./EventRowActions";
import { RejectEventDialog } from "./RejectEventDialog";

/** Aviso que muestra el listado de Eventos tras una acción. */
export type EventActionNotice = { title: string; description?: string };

/** Acción pedida sobre un evento; se conserva al cerrar el diálogo para la animación de salida. */
export type EventActionTarget = { action: EventRowAction; event: Pick<ManagedEvent, "id" | "title"> };

type ConfirmedTransition = "submit" | "approve" | "cancel";

/** Textos de las transiciones que solo piden confirmación (rechazar pide el motivo en su propio diálogo). */
const CONFIRM_COPY: Record<
  ConfirmedTransition,
  {
    title: (title: string) => string;
    description: string;
    confirmLabel: string;
    pendingLabel: string;
    cancelLabel?: string;
    destructive?: boolean;
    notice: (title: string) => EventActionNotice;
  }
> = {
  submit: {
    title: (title) => `¿Enviar «${title}» a revisión?`,
    description:
      "Un administrador lo revisará antes de publicarlo. Mientras está en revisión puedes seguir editándolo: el administrador aprobará la última versión guardada.",
    confirmLabel: "Enviar a revisión",
    pendingLabel: "Enviando…",
    notice: (title) => ({
      title: `«${title}» enviado a revisión`,
      description: "Un administrador lo revisará antes de publicarlo.",
    }),
  },
  approve: {
    title: (title) => `¿Aprobar y publicar «${title}»?`,
    description: "Se genera su inventario de entradas y queda a la venta en el catálogo.",
    confirmLabel: "Aprobar y publicar",
    pendingLabel: "Publicando…",
    notice: (title) => ({ title: `«${title}» aprobado y publicado`, description: "Ya está a la venta en el catálogo." }),
  },
  cancel: {
    title: (title) => `¿Cancelar «${title}»?`,
    description: "Deja de estar a la venta y no se puede volver a publicar. Solo se cancelan eventos sin ventas.",
    confirmLabel: "Cancelar evento",
    pendingLabel: "Cancelando…",
    // "Cancelar" a secas se confundiría con la acción.
    cancelLabel: "Volver",
    destructive: true,
    notice: (title) => ({ title: `«${title}» cancelado`, description: "Ya no está a la venta." }),
  },
};

type EventActionDialogProps = {
  userId: string;
  target: EventActionTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** La acción fue bien: se cierra el diálogo y el listado muestra el aviso. */
  onDone: (notice: EventActionNotice) => void;
};

/** Diálogo de la acción pedida en el listado de Eventos: eliminar, rechazar (con motivo) o confirmar una transición. */
export function EventActionDialog({ userId, target, open, onOpenChange, onDone }: EventActionDialogProps) {
  const moderate = useModerateEvent(userId);
  const event = target?.event ?? null;

  if (target?.action === "delete") {
    return (
      <DeleteEventDialog
        userId={userId}
        event={event}
        open={open}
        onOpenChange={onOpenChange}
        onDeleted={(title) => onDone({ title: `Borrador «${title}» eliminado` })}
      />
    );
  }

  if (target?.action === "reject") {
    return (
      <RejectEventDialog
        userId={userId}
        event={event}
        open={open}
        onOpenChange={onOpenChange}
        onRejected={(title) =>
          onDone({ title: `«${title}» rechazado`, description: "Volvió a borrador con el motivo para el organizador." })
        }
      />
    );
  }

  if (!target) return null;
  const transition = target.action;
  const copy = CONFIRM_COPY[transition];
  const { id, title } = target.event;

  async function handleConfirm() {
    const result = await moderate.mutateAsync({ transition, eventId: id });
    if (!result.ok) return result.error;
    onDone(copy.notice(title));
    return null;
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title(title)}
      description={copy.description}
      confirmLabel={copy.confirmLabel}
      pendingLabel={copy.pendingLabel}
      cancelLabel={copy.cancelLabel}
      destructive={copy.destructive}
      onConfirm={handleConfirm}
      genericError={EVENT_DRAFT_GENERIC_ERROR}
    />
  );
}
