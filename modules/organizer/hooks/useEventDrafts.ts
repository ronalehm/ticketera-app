"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEventAction, deleteEventAction, updateEventAction } from "../actions/eventDrafts.actions";
import type { EventDraftActionResult, EventDraftFormValues } from "../types/organizer.types";
import type { EventDraftErrorCode } from "../utils/eventDraftError";
import { managedEventsBaseKey } from "./useManagedEvents";

/**
 * Guarda el borrador: lo crea sin `eventId` o edita el borrador `eventId`. Devuelve el resultado de la acción tal cual
 * (`{ ok: false, error }` no lanza, para mostrarlo en el formulario). Si fue bien, descarta los listados del usuario en
 * caché: tras guardar se navega a Mis eventos, que trae la lista fresca del servidor (con la caché, se vería la
 * anterior hasta recargar).
 */
export function useSaveEventDraft(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, values }: { eventId?: string; values: EventDraftFormValues }) =>
      eventId ? updateEventAction(eventId, values) : createEventAction(values),
    onSuccess: (result) => {
      if (result.ok) queryClient.removeQueries({ queryKey: managedEventsBaseKey(userId) });
    },
  });
}

/**
 * Fallos que significan que el listado está desactualizado: otro usuario eliminó el evento, cambió su estado o le
 * entraron ventas.
 */
const STALE_LIST_CODES: readonly EventDraftErrorCode[] = [
  "not_found",
  "delete_not_draft",
  "has_activity",
  "submit_not_draft",
  "not_pending_review",
  "cancel_not_published",
  "has_sales",
];

/** Hay que recargar los listados tras una mutación: fue bien o falló porque el listado está desactualizado. */
export function shouldReloadManagedEvents(result: EventDraftActionResult): boolean {
  return result.ok || (result.code !== undefined && STALE_LIST_CODES.includes(result.code));
}

/**
 * Elimina un borrador. Si fue bien, o si falló porque el listado está desactualizado, invalida y espera la recarga de
 * los listados del usuario (Mis eventos está a la vista).
 */
export function useDeleteEventDraft(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => deleteEventAction(eventId),
    onSuccess: async (result) => {
      if (shouldReloadManagedEvents(result)) {
        await queryClient.invalidateQueries({ queryKey: managedEventsBaseKey(userId) });
      }
    },
  });
}
