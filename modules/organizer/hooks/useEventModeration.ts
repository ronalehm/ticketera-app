"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  approveEventAction,
  cancelEventAction,
  rejectEventAction,
  submitForReviewAction,
} from "../actions/eventModeration.actions";
import type { EventDraftActionResult } from "../types/organizer.types";
import { shouldReloadManagedEvents } from "./useEventDrafts";
import { managedEventsBaseKey } from "./useManagedEvents";

/** Transición pedida desde el listado de Eventos; rechazar lleva la nota para el organizador. */
export type ModerationRequest =
  | { transition: "submit" | "approve" | "cancel"; eventId: string }
  | { transition: "reject"; eventId: string; note: string };

function runModeration(request: ModerationRequest): Promise<EventDraftActionResult> {
  switch (request.transition) {
    case "submit":
      return submitForReviewAction(request.eventId);
    case "approve":
      return approveEventAction(request.eventId);
    case "reject":
      return rejectEventAction(request.eventId, request.note);
    case "cancel":
      return cancelEventAction(request.eventId);
  }
}

/**
 * Envía a revisión, aprueba, rechaza o cancela un evento. Devuelve el resultado de la acción tal cual (`{ ok: false }` no
 * lanza, para mostrarlo en el diálogo). Si fue bien, o si falló porque el listado está desactualizado, invalida y espera
 * la recarga de los listados del usuario.
 */
export function useModerateEvent(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runModeration,
    onSuccess: async (result) => {
      if (shouldReloadManagedEvents(result)) {
        await queryClient.invalidateQueries({ queryKey: managedEventsBaseKey(userId) });
      }
    },
  });
}
