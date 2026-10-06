"use client";

import { useId } from "react";
import Link from "next/link";
import { Ban, Check, Ellipsis, Pencil, Send, Trash2, X, type LucideIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { roleCan } from "@/modules/auth/permissions";
import type { ManagedEvent } from "@/modules/events";

import { CANCEL_WITH_SALES_MESSAGE } from "../utils/eventDraftError";
import { type EventTransition, getAvailableTransitions } from "../utils/eventTransitions";
import { FeaturedIcon, featuredLabel, FeaturedToggle } from "./FeaturedToggle";

const ACTION_CLASS = "h-11 cursor-pointer gap-1.5 px-3 font-semibold duration-200";
// Botones de icono de la tabla: 44 px (MASTER «Targets táctiles»).
const ICON_ACTION_CLASS = cn(buttonVariants({ variant: "outline", size: "icon" }), "size-11 cursor-pointer duration-200");
const MENU_ITEM_CLASS = "min-h-11 cursor-pointer gap-3 rounded-lg px-3 text-sm font-medium";

const CANCEL_BLOCKED_REASON = `Tiene ventas o reservas en curso · ${CANCEL_WITH_SALES_MESSAGE}`;

/** Lo que se pide desde una fila: eliminar un borrador o una transición de moderación. */
export type EventRowAction = "delete" | EventTransition;

/** Tabla (lg): Editar como icono y el resto en «Más acciones». Tarjeta (< lg): botones con texto. */
export type EventRowActionsLayout = "table" | "card";

/**
 * Estados que se editan (spec event-editing, Decisión 1): borrador y en revisión libres (sigue en revisión al guardar);
 * publicado con límites. Cancelado y finalizado no.
 */
const EDITABLE_STATUSES: ReadonlySet<ManagedEvent["status"]> = new Set(["draft", "pending_review", "published"]);

type Tone = "primary" | "outline" | "destructive";

/** Acciones distintas de Editar, en el orden en que se muestran. */
const ACTION_ITEMS: { action: EventRowAction; label: string; Icon: LucideIcon; tone: Tone }[] = [
  { action: "delete", label: "Eliminar", Icon: Trash2, tone: "destructive" },
  { action: "submit", label: "Enviar a revisión", Icon: Send, tone: "primary" },
  { action: "approve", label: "Aprobar", Icon: Check, tone: "primary" },
  { action: "reject", label: "Rechazar", Icon: X, tone: "outline" },
  { action: "cancel", label: "Cancelar evento", Icon: Ban, tone: "destructive" },
];

const TONE_HOVER: Record<Tone, string> = {
  primary: "hover:bg-primary-strong",
  outline: "",
  destructive: "hover:bg-destructive/10",
};

type Role = Parameters<typeof getAvailableTransitions>[0];

/**
 * ¿Tiene acciones un evento en `status` para `role`? Un admin siempre (destacar, en cualquier estado); para el resto,
 * cancelado y finalizado ninguna.
 */
export function hasEventRowActions(status: ManagedEvent["status"], role: Role): boolean {
  return (
    roleCan(role, "events:manageAny") ||
    EDITABLE_STATUSES.has(status) ||
    getAvailableTransitions(role, status).length > 0
  );
}

type EventRowActionsProps = {
  event: Pick<ManagedEvent, "id" | "title" | "status" | "hasActiveSales" | "featured">;
  /** Rol de la sesión: decide qué transiciones se ofrecen (`getAvailableTransitions`) y si se puede destacar. */
  role: Role;
  layout: EventRowActionsLayout;
  onAction: (action: EventRowAction) => void;
  /** Destacar o quitar destacado (solo `events:manageAny`); sin diálogo. */
  onToggleFeatured: () => void;
  /** Hay un cambio de destacado en curso para este evento: la acción queda deshabilitada. */
  featuredPending?: boolean;
};

/**
 * Acciones de un evento según su estado y el rol (spec admin-panel, F5b): Editar (borrador, en revisión y publicado;
 * spec event-editing), Eliminar y Enviar a revisión (borrador), Aprobar y Rechazar (en revisión, admin), Cancelar
 * evento (publicado, admin; deshabilitado con el motivo si tiene ventas) y Destacar / Quitar destacado (admin, en
 * cualquier estado; spec events-dynamic-landing). En cancelado y finalizado, un organizador no tiene acciones. En la
 * tabla son compactas (spec organizer-events-view, Requisito 6).
 */
export function EventRowActions({
  event,
  role,
  layout,
  onAction,
  onToggleFeatured,
  featuredPending = false,
}: EventRowActionsProps) {
  if (!hasEventRowActions(event.status, role)) return null;
  const transitions: EventRowAction[] = getAvailableTransitions(role, event.status);
  if (event.status === "draft") transitions.push("delete");
  const items = ACTION_ITEMS.filter(({ action }) => transitions.includes(action));
  const editable = EDITABLE_STATUSES.has(event.status);
  const canFeature = roleCan(role, "events:manageAny");
  const editHref = `/organizador/eventos/${event.id}/editar`;

  if (layout === "table") {
    return (
      <>
        {editable && (
          <Link href={editHref} aria-label={`Editar ${event.title}`} className={ICON_ACTION_CLASS}>
            <Pencil className="size-4" aria-hidden />
          </Link>
        )}
        {(items.length > 0 || canFeature) && (
          <DropdownMenu>
            <DropdownMenuTrigger aria-label={`Más acciones de ${event.title}`} className={ICON_ACTION_CLASS}>
              <Ellipsis className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto max-w-72 min-w-48 p-1.5">
              {items.map(({ action, label, Icon, tone }) =>
                action === "cancel" && event.hasActiveSales ? (
                  <CancelBlockedItem key={action} />
                ) : (
                  <DropdownMenuItem key={action} className={MENU_ITEM_CLASS} onClick={() => onAction(action)}>
                    {/* Rojo solo en el icono: el texto rojo sobre blanco no llega a 4.5:1 (MASTER §2). */}
                    <Icon className={cn(tone === "destructive" && "text-destructive")} aria-hidden />
                    {label}
                  </DropdownMenuItem>
                ),
              )}
              {canFeature && (
                <DropdownMenuItem className={MENU_ITEM_CLASS} disabled={featuredPending} onClick={onToggleFeatured}>
                  <FeaturedIcon featured={event.featured} />
                  {featuredLabel(event.featured)}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </>
    );
  }

  return (
    <>
      {editable && (
        <Link
          href={editHref}
          aria-label={`Editar ${event.title}`}
          className={cn(buttonVariants({ variant: "outline" }), ACTION_CLASS)}
        >
          <Pencil className="size-4" aria-hidden />
          Editar
        </Link>
      )}
      {items.map(({ action, label, Icon, tone }) =>
        action === "cancel" ? (
          <CancelEventButton
            key={action}
            title={event.title}
            hasSales={event.hasActiveSales}
            onCancel={() => onAction("cancel")}
          />
        ) : (
          <Button
            key={action}
            type="button"
            variant={tone === "primary" ? "default" : "outline"}
            aria-label={`${label} ${event.title}`}
            onClick={() => onAction(action)}
            className={cn(ACTION_CLASS, TONE_HOVER[tone])}
          >
            <Icon className={cn("size-4", tone === "destructive" && "text-destructive")} aria-hidden />
            {label}
          </Button>
        ),
      )}
      {canFeature && (
        <FeaturedToggle
          featured={event.featured}
          aria-label={`${featuredLabel(event.featured)} ${event.title}`}
          disabled={featuredPending}
          onClick={onToggleFeatured}
        />
      )}
    </>
  );
}

/** «Cancelar evento» bloqueado en el menú: deshabilitado (Base UI no lo ejecuta) y con el motivo (Decisión 12). */
function CancelBlockedItem() {
  const labelId = useId();
  const reasonId = useId();
  return (
    <DropdownMenuItem
      disabled
      aria-labelledby={labelId}
      aria-describedby={reasonId}
      // Sin la opacidad por defecto: el motivo tiene que leerse (contraste AA).
      className={cn(MENU_ITEM_CLASS, "items-start py-2 data-disabled:opacity-100")}
    >
      <Ban className="mt-0.5 text-muted-foreground" aria-hidden />
      <span className="flex flex-col gap-0.5">
        <span id={labelId} className="text-muted-foreground">
          Cancelar evento
        </span>
        <span id={reasonId} className="text-xs text-muted-foreground">
          {CANCEL_BLOCKED_REASON}
        </span>
      </span>
    </DropdownMenuItem>
  );
}

/** "Cancelar evento": con ventas queda deshabilitado (enfocable) con el motivo debajo (Decisión 12). */
function CancelEventButton({ title, hasSales, onCancel }: { title: string; hasSales: boolean; onCancel: () => void }) {
  const reasonId = useId();
  return (
    <div className="flex flex-col items-stretch gap-1">
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
          {CANCEL_BLOCKED_REASON}
        </p>
      )}
    </div>
  );
}
