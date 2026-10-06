"use client";

import { useId, useState, type FormEvent } from "react";
import { Search, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { getPanelRoleLabel } from "@/modules/panel";

import { ORGANIZER_STATUS_BADGE, USER_ROLE_ORDER } from "../data/userBadges";
import { useUsers } from "../hooks/useUsers";
import { DEFAULT_USERS_FILTERS } from "../schemas/users.schema";
import type { UserRole, UsersFilters, UsersPage } from "../types/users.types";
import { UsersPagination } from "./UsersPagination";
import { type UserRowActions, UsersTableRows } from "./UsersTableRows";

const STATUS_OPTIONS = Object.entries(ORGANIZER_STATUS_BADGE).map(([value, { label }]) => ({ value, label }));

// Mismo alto (44 px) para los selects, el campo y los botones.
const SELECT_CLASS =
  "w-full md:w-48 *:data-[slot=native-select]:h-11 *:data-[slot=native-select]:cursor-pointer *:data-[slot=native-select]:bg-background *:data-[slot=native-select]:pl-3 *:data-[slot=native-select]:text-sm";

type UsersTableProps = UserRowActions & {
  actor: { id: string; role: UserRole };
  /** Primera página con `DEFAULT_USERS_FILTERS` (`listUsers` en el servidor). */
  initialData: UsersPage;
};

/** Hay búsqueda o filtro de rol/estado (la página y las filas no cuentan). */
const hasActiveFilters = (filters: UsersFilters) =>
  filters.q !== DEFAULT_USERS_FILTERS.q ||
  filters.role !== DEFAULT_USERS_FILTERS.role ||
  filters.organizerStatus !== DEFAULT_USERS_FILTERS.organizerStatus;

/**
 * Listado de `/admin/usuarios`: búsqueda (al enviar), filtros de rol y estado de organizador, tabla (lg) o tarjetas y
 * paginación, todo en el servidor (`useUsers`). Al cambiar de filtros se mantiene la página anterior (`aria-busy`)
 * hasta que llega la nueva.
 */
export function UsersTable({ actor, initialData, ...actions }: UsersTableProps) {
  const [filters, setFilters] = useState<UsersFilters>(DEFAULT_USERS_FILTERS);
  const [searchText, setSearchText] = useState("");
  const headingId = useId();
  const searchId = useId();
  const roleId = useId();
  const statusId = useId();
  const { data, isError, isPlaceholderData } = useUsers(actor.id, filters, initialData);
  const filtered = hasActiveFilters(filters);

  // Tras eliminar el último usuario de la última página, esa página ya no existe: se pasa a la última que queda.
  const lastPage = data ? Math.max(1, Math.ceil(data.total / filters.pageSize)) : 1;
  if (data && !isPlaceholderData && filters.page > lastPage) setFilters({ ...filters, page: lastPage });

  /** Cambia filtros y vuelve a la página 1. */
  function applyFilters(changes: Partial<Omit<UsersFilters, "page">>) {
    setFilters((current) => ({ ...current, ...changes, page: 1 }));
  }

  function clearFilters() {
    setSearchText("");
    setFilters((current) => ({ ...DEFAULT_USERS_FILTERS, pageSize: current.pageSize }));
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters({ q: searchText.trim() });
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={isPlaceholderData}
      className="flex flex-col gap-3 lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:bg-card lg:ring-1 lg:ring-border"
    >
      <div className="flex flex-col gap-4 lg:border-b lg:px-6 lg:py-4">
        <h2 id={headingId} className="text-lg font-bold">
          Listado
        </h2>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
          <form role="search" onSubmit={handleSearch} className="flex min-w-0 flex-col gap-1.5 md:basis-full xl:flex-1 xl:basis-auto">
            <Label htmlFor={searchId}>Buscar</Label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id={searchId}
                  name="q"
                  type="search"
                  maxLength={100}
                  placeholder="Nombre o correo"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  className="h-11 bg-background pl-9"
                />
              </div>
              <Button type="submit" variant="outline" className="h-11 cursor-pointer px-4 font-semibold">
                Buscar
              </Button>
            </div>
          </form>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={roleId}>Rol</Label>
            <NativeSelect
              id={roleId}
              value={filters.role}
              onChange={(event) => applyFilters({ role: event.target.value as UsersFilters["role"] })}
              className={SELECT_CLASS}
            >
              <NativeSelectOption value="all">Todos los roles</NativeSelectOption>
              {USER_ROLE_ORDER.map((role) => (
                <NativeSelectOption key={role} value={role}>
                  {getPanelRoleLabel(role)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={statusId}>Estado de organizador</Label>
            <NativeSelect
              id={statusId}
              value={filters.organizerStatus}
              onChange={(event) =>
                applyFilters({ organizerStatus: event.target.value as UsersFilters["organizerStatus"] })
              }
              className={SELECT_CLASS}
            >
              <NativeSelectOption value="all">Todos</NativeSelectOption>
              {STATUS_OPTIONS.map(({ value, label }) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          {filtered && (
            <Button type="button" variant="ghost" className="h-11 cursor-pointer px-4 font-semibold" onClick={clearFilters}>
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {isError && (
        <p role="alert" className="rounded-2xl bg-card p-4 text-sm text-destructive ring-1 ring-border lg:m-6 lg:mb-0">
          No pudimos cargar los usuarios. Inténtalo de nuevo.
        </p>
      )}

      {data && data.items.length > 0 && (
        <>
          <UsersTableRows users={data.items} actor={actor} labelledBy={headingId} {...actions} />
          <div className="pt-2 lg:border-t lg:px-6 lg:py-4">
            <UsersPagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              shown={data.items.length}
              onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
              onPageSizeChange={(pageSize) => applyFilters({ pageSize })}
            />
          </div>
        </>
      )}

      {/* Con error ya lo dice el aviso: una lista vacía no significa "sin resultados". */}
      {data && data.items.length === 0 && !isError && data.total === 0 && (
        <Empty className="rounded-2xl border-2 border-dashed border-border bg-card px-6 py-12 lg:m-6 lg:bg-muted">
          <EmptyHeader className="max-w-md">
            <EmptyMedia variant="icon" aria-hidden className="size-12 rounded-2xl bg-accent text-accent-foreground">
              <Users className="size-6" />
            </EmptyMedia>
            <EmptyTitle className="text-lg font-bold">
              <h3>Sin resultados</h3>
            </EmptyTitle>
            <EmptyDescription className="text-base">
              {filtered ? "Ningún usuario coincide con los filtros." : "Aún no hay usuarios registrados."}
            </EmptyDescription>
          </EmptyHeader>
          {filtered && (
            <EmptyContent>
              <Button variant="outline" className="h-11 cursor-pointer px-4 font-semibold" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </EmptyContent>
          )}
        </Empty>
      )}
    </section>
  );
}
