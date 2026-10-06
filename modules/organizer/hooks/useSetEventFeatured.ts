"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setEventFeaturedAction } from "../actions/eventFeatured.actions";
import { shouldReloadManagedEvents } from "./useEventDrafts";
import { managedEventsBaseKey } from "./useManagedEvents";

/**
 * Marca o quita un evento de destacados (admin). Devuelve el resultado de la acción tal cual (`{ ok: false }` no lanza).
 * Si fue bien, o si falló porque el listado está desactualizado, invalida y espera la recarga de los listados del usuario.
 */
export function useSetEventFeatured(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => setEventFeaturedAction(id, featured),
    onSuccess: async (result) => {
      if (shouldReloadManagedEvents(result)) {
        await queryClient.invalidateQueries({ queryKey: managedEventsBaseKey(userId) });
      }
    },
  });
}
