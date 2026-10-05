import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ManagedEvent } from "@/modules/events";

const ACTION_CLASS = "h-11 cursor-pointer gap-1.5 px-3 font-semibold duration-200";

type DraftEventActionsProps = {
  event: Pick<ManagedEvent, "id" | "title">;
  onDelete: () => void;
};

/** Acciones de un borrador en Mis eventos: "Editar" (enlace a su formulario) y "Eliminar" (abre la confirmación). */
export function DraftEventActions({ event, onDelete }: DraftEventActionsProps) {
  return (
    <>
      <Link
        href={`/organizador/eventos/${event.id}/editar`}
        aria-label={`Editar ${event.title}`}
        className={cn(buttonVariants({ variant: "outline" }), ACTION_CLASS)}
      >
        <Pencil className="size-4" aria-hidden />
        Editar
      </Link>
      <Button
        type="button"
        variant="outline"
        aria-label={`Eliminar ${event.title}`}
        onClick={onDelete}
        className={cn(ACTION_CLASS, "hover:bg-destructive/10")}
      >
        {/* Rojo solo en el icono: el texto rojo sobre blanco no llega a 4.5:1 (MASTER §2). */}
        <Trash2 className="size-4 text-destructive" aria-hidden />
        Eliminar
      </Button>
    </>
  );
}
