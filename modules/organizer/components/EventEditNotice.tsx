import { Info, MessageSquareWarning } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { EditableEvent } from "../types/organizer.types";

type EventEditNoticeProps = Pick<EditableEvent, "status" | "reviewNote" | "hasSales">;

/**
 * Aviso sobre el formulario de Editar según el estado (spec admin-panel, F5b; spec event-editing): el motivo del rechazo
 * en un borrador rechazado, que un evento en revisión sigue en revisión al guardar o qué se puede cambiar de un evento
 * publicado.
 */
export function EventEditNotice({ status, reviewNote, hasSales }: EventEditNoticeProps) {
  if (status === "draft" && reviewNote) {
    return (
      <Alert className="px-4 py-3">
        <MessageSquareWarning aria-hidden />
        <AlertTitle className="font-semibold">El administrador pidió cambios</AlertTitle>
        <AlertDescription>
          <p className="whitespace-pre-line text-foreground">{reviewNote}</p>
          <p>Corrígelo y vuelve a enviarlo a revisión desde Eventos.</p>
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "pending_review") {
    return (
      <Alert className="px-4 py-3">
        <Info aria-hidden />
        <AlertTitle className="font-semibold">Este evento está en revisión</AlertTitle>
        <AlertDescription>Al guardar sigue en revisión y el administrador revisa la versión nueva.</AlertDescription>
      </Alert>
    );
  }

  if (status !== "published") return null;
  const notice = hasSales
    ? {
        title: "Este evento tiene ventas o reservas en curso",
        description:
          "Puedes cambiar los textos, la portada, la categoría, la fecha y los nombres y precios de las entradas (si cambias la fecha, los compradores la verán actualizada). El recinto y las secciones a la venta ya no se cambian.",
      }
    : {
        title: "Este evento está publicado",
        description:
          "Puedes cambiar los textos, la portada, la categoría, la fecha y los precios. El recinto y las secciones a la venta ya no se cambian.",
      };

  return (
    <Alert className="px-4 py-3">
      <Info aria-hidden />
      <AlertTitle className="font-semibold">{notice.title}</AlertTitle>
      <AlertDescription>{notice.description}</AlertDescription>
    </Alert>
  );
}
