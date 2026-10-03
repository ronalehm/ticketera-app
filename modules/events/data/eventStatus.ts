import type { EventStatus } from "../types/events.types";

// Texto navy sobre warning/destructive: blanco no llega a 4.5:1 (MASTER §2, §11).
export const EVENT_STATUS_BADGE: Record<EventStatus, { label: string; className: string }> = {
  available: { label: "Disponible", className: "bg-accent text-accent-foreground" },
  "low-stock": { label: "Últimas entradas", className: "bg-warning text-warning-foreground" },
  "sold-out": { label: "Agotado", className: "bg-destructive text-foreground" },
};
