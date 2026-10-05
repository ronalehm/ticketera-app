"use client";

import { useId } from "react";
import Link from "next/link";
import { Ban, Check, Pencil, Send, Trash2, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ManagedEvent } from "@/modules/events";

import { CANCEL_WITH_SALES_MESSAGE } from "../utils/eventDraftError";
import { type EventTransition, getAvailableTransitions } from "../utils/eventTransitions";

const ACTION_CLASS = "h-11 cursor-pointer gap-1.5 px-3 font-semibold duration-200";

/** Lo que se pide desde una fila: eliminar un borrador o una transición de moderación. */
export type EventRowAction = "delete" | EventTransition;

/**
 * Estados que se editan (Decisión 11): borrador libre; publicado con límites. En revisión no (lo que se aprueba es lo que
 * se revisó: para cambiarlo, el admin lo rechaza).
 */
const EDITABLE_STATUSES: ReadonlySet<ManagedEvent["status"]> = new Set(["draft", "published"]);

type Role = Parameters<typeof getAvailableTransitions>[0];

/** ¿Tiene acciones un evento en `status` para `role`? Cancelado y finalizado, ninguna. */
export function hasEventRowActions(status: ManagedEvent["status"], role: Role): boolean {
  return EDITABLE_STATUSES.has(status) || getAvailableTransitions(role, status).length > 0;
}

type EventRowActionsProps = {
  event: Pick<ManagedEvent, "id" | "title" | "status" | "sold">;
  /** Rol de la sesión: decide qué transiciones se ofrecen (`getAvailableTransitions`). */
  role: Role;
  onAction: (action: EventRowAction) => void;
};

/**
 * Acciones de un evento en Mis eventos según su estado y el rol (spec admin-panel, F5b): Editar (borrador y publicado),
 * Eliminar y Enviar a revisión (borrador), Aprobar y Rechazar (en revisión, admin) y Cancelar evento (publicado, admin;
 * deshabilitado con el motivo si tiene ventas). En revisión, un organizador no tiene acciones; cancelado y finalizado,
 * nadie.
 */
export function EventRowActions({ event, role, onAction }: EventRowActionsProps) {
  if (!hasEventRowActions(event.status, role)) return null;
  const transitions = getAvailableTransitions(role, event.status);
  const editable = EDITABLE_STATUSES.has(event.status);

  return (
    <>
      {editable && (
        <Link
          href={`/organizador/eventos/${event.id}/editar`}
          aria-label={`Editar ${event.title}`}
          className={cn(buttonVariants({ variant: "outline" }), ACTION_CLASS)}
        >
          <Pencil className="size-4" aria-hidden />
          Editar
        </Link>
      )}
      {event.status === "draft" && (
        <Button
          type="button"
          variant="outline"
          aria-label={`Eliminar ${event.title}`}
          onClick={() => onAction("delete")}
          className={cn(ACTION_CLASS, "hover:bg-destructive/10")}
        >
          {/* Rojo solo en el icono: el texto rojo sobre blanco no llega a 4.5:1 (MASTER §2). */}
          <Trash2 className="size-4 text-destructive" aria-hidden />
          Eliminar
        </Button>
      )}
      {transitions.includes("submit") && (
        <Button
          type="button"
          aria-label={`Enviar a revisión ${event.title}`}
          onClick={() => onAction("submit")}
          className={cn(ACTION_CLASS, "hover:bg-primary-strong")}
        >
          <Send className="size-4" aria-hidden />
          Enviar a revisión
        </Button>
      )}
      {transitions.includes("approve") && (
        <Button
          type="button"
          aria-label={`Aprobar ${event.title}`}
          onClick={() => onAction("approve")}
          className={cn(ACTION_CLASS, "hover:bg-primary-strong")}
        >
          <Check className="size-4" aria-hidden />
          Aprobar
        </Button>
      )}
      {transitions.includes("reject") && (
        <Button
          type="button"
          variant="outline"
          aria-label={`Rechazar ${event.title}`}
          onClick={() => onAction("reject")}
          className={ACTION_CLASS}
        >
          <X className="size-4" aria-hidden />
          Rechazar
        </Button>
      )}
      {transitions.includes("cancel") && (
        <CancelEventButton title={event.title} hasSales={event.sold > 0} onCancel={() => onAction("cancel")} />
      )}
    </>
  );
}

/** "Cancelar evento": con ventas queda deshabilitado (enfocable) con el motivo debajo (Decisión 12). */
function CancelEventButton({ title, hasSales, onCancel }: { title: string; hasSales: boolean; onCancel: () => void }) {
  const reasonId = useId();
  return (
    <div className="flex flex-col items-stretch gap-1 lg:items-end">
      <Button
        type="button"
        variant="outline"
        aria-label={`Cancelar evento ${title}`}
        aria-describedby={hasSales ? reasonId : undefined}
        disabled={hasSales}
        focusableWhenDisabled
        onClick={onCancel}
        className={cn(ACTION_CLASS, "hover:bg-destructive/10")}
      >
        <Ban className="size-4 text-destructive" aria-hidden />
        Cancelar evento
      </Button>
      {hasSales && (
        <p id={reasonId} className="text-xs text-muted-foreground">
          Tiene ventas · {CANCEL_WITH_SALES_MESSAGE}
        </p>
      )}
    </div>
  );
}
