import { type Action, roleCan } from "@/modules/auth/permissions";
import type { ManagedEventStatus } from "@/modules/events";

// Moderación de eventos (spec admin-panel, F5b, requisito 1). Pura: solo mira el rol y el estado. Lo que depende de la
// BD (dueño del evento, organizador aprobado, ventas, requisitos para publicar) lo comprueba el servicio.

export type EventTransition = "submit" | "approve" | "reject" | "cancel";

type Role = Parameters<typeof roleCan>[0];

/**
 * Transiciones permitidas: estado de origen, de destino y permiso que exige. `cancelled` es terminal y `finished` lo pone
 * el sistema: ninguna transición sale de ellos ni lleva a `finished`. Cualquier otra combinación se rechaza.
 */
export const EVENT_TRANSITIONS: Record<
  EventTransition,
  { from: ManagedEventStatus; to: ManagedEventStatus; permission: Action }
> = {
  // El organizador envía a revisión su borrador; el admin también puede (gestiona cualquier evento).
  submit: { from: "draft", to: "pending_review", permission: "events:manageOwn" },
  approve: { from: "pending_review", to: "published", permission: "events:moderate" },
  // Rechazar devuelve a borrador con `review_note` obligatoria.
  reject: { from: "pending_review", to: "draft", permission: "events:moderate" },
  // Solo sin ventas activas: `paid`, `partially_refunded` o `pending` vigentes (lo comprueba el servicio).
  cancel: { from: "published", to: "cancelled", permission: "events:moderate" },
};

/** ¿Puede `role` aplicar `transition` a un evento en `status`? */
export function canTransition(role: Role, status: ManagedEventStatus, transition: EventTransition): boolean {
  const rule = EVENT_TRANSITIONS[transition];
  return rule.from === status && roleCan(role, rule.permission);
}

/** Transiciones que `role` puede aplicar a un evento en `status`, en el orden de `EVENT_TRANSITIONS`. */
export function getAvailableTransitions(role: Role, status: ManagedEventStatus): EventTransition[] {
  return (Object.keys(EVENT_TRANSITIONS) as EventTransition[]).filter((transition) =>
    canTransition(role, status, transition),
  );
}
