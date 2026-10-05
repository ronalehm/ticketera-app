"use client";

import { useQuery } from "@tanstack/react-query";
import type { ManagedEvent, ManagedEventsFilters } from "@/modules/events";
import { listManagedEventsAction } from "../actions/managedEvents.actions";

/** Sin filtros: con ellos trae el servidor los eventos iniciales de Resumen y Mis eventos. */
export const DEFAULT_MANAGED_EVENTS_FILTERS: ManagedEventsFilters = { status: "all", q: "" };

/**
 * Query key de los eventos del panel: única para Resumen y Mis eventos (comparten caché con los mismos filtros). Incluye
 * el usuario: tras cerrar sesión y entrar con otra cuenta en la misma pestaña, nunca se sirven los datos del anterior.
 */
export const managedEventsQueryKey = (userId: string, filters: ManagedEventsFilters) =>
  ["managed-events", userId, filters] as const;

/**
 * Eventos que gestiona el usuario `userId` con `filters`. `initialData` (los que trae el servidor) solo debe pasarse
 * para los filtros con los que se obtuvieron: TanStack los guarda bajo la key actual. Al cambiar de filtros se mantiene
 * la lista anterior hasta que llega la nueva, pero solo si es del mismo usuario (al cambiar de usuario no hay placeholder).
 */
export function useManagedEvents(userId: string, filters: ManagedEventsFilters, initialData?: ManagedEvent[]) {
  return useQuery({
    queryKey: managedEventsQueryKey(userId, filters),
    queryFn: () => listManagedEventsAction(filters),
    initialData,
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === userId ? previousData : undefined,
  });
}
