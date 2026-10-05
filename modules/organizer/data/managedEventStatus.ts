import type { ManagedEventStatus } from "@/modules/events";

// Patrón de EVENT_STATUS_BADGE: el estado siempre lleva texto, nunca solo color. Texto navy sobre warning y destructive
// (blanco no llega a 4.5:1, MASTER §2).
export const MANAGED_EVENT_STATUS_BADGE: Record<ManagedEventStatus, { label: string; className: string }> = {
  draft: { label: "Borrador", className: "bg-secondary text-secondary-foreground" },
  pending_review: { label: "En revisión", className: "bg-warning text-warning-foreground" },
  published: { label: "Publicado", className: "bg-accent text-accent-foreground" },
  cancelled: { label: "Cancelado", className: "bg-destructive text-foreground" },
  finished: { label: "Finalizado", className: "border-border bg-background text-muted-foreground" },
};
