"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteUserAction,
  inviteUserAction,
  listUsersAction,
  setOrganizerStatusAction,
  updateUserAction,
} from "../actions/users.actions";
import { DEFAULT_USERS_FILTERS } from "../schemas/users.schema";
import type {
  InviteUserFormValues,
  UserManagementErrorCode,
  UpdateUserFormValues,
  UserOrganizerStatus,
  UsersActionResult,
  UsersFilters,
  UsersPage,
} from "../types/users.types";

/**
 * Query keys de usuarios. Incluyen al actor: tras cerrar sesión y entrar con otra cuenta en la misma pestaña, nunca se
 * sirven los datos del anterior. Las mutaciones invalidan todas las páginas del actor (`usersBaseKey`).
 */
export const usersBaseKey = (actorId: string) => ["users", actorId] as const;
export const usersQueryKey = (actorId: string, filters: UsersFilters) => [...usersBaseKey(actorId), filters] as const;

const isDefaultFilters = (filters: UsersFilters) =>
  (Object.keys(DEFAULT_USERS_FILTERS) as (keyof UsersFilters)[]).every((key) => filters[key] === DEFAULT_USERS_FILTERS[key]);

/**
 * Página de usuarios con `filters` para el actor `actorId`. `initialData` es la precarga del servidor con
 * `DEFAULT_USERS_FILTERS`: solo se usa con esos filtros. Al cambiar de filtros o de página se mantiene la anterior
 * hasta que llega la nueva, pero solo si es del mismo actor. Un `{ ok: false }` de la acción deja la query en error.
 */
export function useUsers(actorId: string, filters: UsersFilters, initialData?: UsersPage) {
  return useQuery({
    queryKey: usersQueryKey(actorId, filters),
    queryFn: async () => {
      const result = await listUsersAction(filters);
      if (!result.ok) throw new Error(result.error);
      return result.data;
    },
    initialData: isDefaultFilters(filters) ? initialData : undefined,
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === actorId ? previousData : undefined,
  });
}

/** Fallos que significan que el listado está desactualizado (otro admin eliminó o cambió al usuario). */
const STALE_LIST_CODES: readonly UserManagementErrorCode[] = ["not_found", "conflict"];

/**
 * Mutación de usuarios: devuelve el resultado de la acción tal cual (`{ ok: false, error, fieldErrors }` no lanza, para
 * pintarlo en el formulario). Si fue bien, o si falló porque el listado está desactualizado (`not_found`,
 * `conflict`), invalida y espera la recarga del listado del actor.
 */
function useUsersMutation<TVariables, TResult extends UsersActionResult>(
  actorId: string,
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (result) => {
      if (result.ok || (result.code && STALE_LIST_CODES.includes(result.code))) {
        await queryClient.invalidateQueries({ queryKey: usersBaseKey(actorId) });
      }
    },
  });
}

export function useInviteUser(actorId: string) {
  return useUsersMutation(actorId, (values: InviteUserFormValues) => inviteUserAction(values));
}

export function useUpdateUser(actorId: string) {
  return useUsersMutation(actorId, ({ id, values }: { id: string; values: UpdateUserFormValues }) =>
    updateUserAction(id, values),
  );
}

export function useSetOrganizerStatus(actorId: string) {
  return useUsersMutation(actorId, ({ id, status }: { id: string; status: UserOrganizerStatus }) =>
    setOrganizerStatusAction(id, status),
  );
}

export function useDeleteUser(actorId: string) {
  return useUsersMutation(actorId, (id: string) => deleteUserAction(id));
}
