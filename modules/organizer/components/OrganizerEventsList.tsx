"use client";

import { useId, useState, type FormEvent } from "react";
import { CircleCheck, Search, X } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { formatCount } from "@/lib/formatNumber";
import type { ManagedEvent, ManagedEventsFilters } from "@/modules/events";

import { MANAGED_EVENT_STATUS_BADGE } from "../data/managedEventStatus";
import { DEFAULT_MANAGED_EVENTS_FILTERS, useManagedEvents } from "../hooks/useManagedEvents";
import type { ManagedEventsStatusFilter, SavedStatus } from "../types/organizer.types";
import { DeleteEventDialog } from "./DeleteEventDialog";
import { DraftEventActions } from "./DraftEventActions";
import { OrganizerEventsTable } from "./OrganizerEventsTable";

const STATUS_OPTIONS = Object.entries(MANAGED_EVENT_STATUS_BADGE).map(([value, { label }]) => ({ value, label }));

// Mismo alto (44 px) para el select, el campo y el botón.
const SELECT_CLASS =
  "w-full md:w-52 *:data-[slot=native-select]:h-11 *:data-[slot=native-select]:cursor-pointer *:data-[slot=native-select]:bg-background *:data-[slot=native-select]:pl-3 *:data-[slot=native-select]:text-sm";

type OrganizerEventsListProps = {
  /** Id del usuario de la sesión: separa la caché de cada usuario. */
  userId: string;
  /** Todos los eventos que gestiona el usuario (`listManagedEvents` en el servidor, sin filtros). */
  initialEvents: ManagedEvent[];
  /** Muestra el organizador de cada evento (admin, que ve los de todos). */
  showOrganizer?: boolean;
  /** Puede editar y eliminar borradores (no es un organizador en solo lectura). */
  canMutate?: boolean;
  /** Aviso tras guardar en el formulario (`?guardado=borrador`). */
  saved?: SavedStatus;
};

/** Diálogo de eliminar abierto sobre un borrador; al cerrarlo se conserva el evento para la animación de salida. */
type DeleteTarget = { event: ManagedEvent | null; open: boolean };

/** Aviso tras guardar: el borrador ya está en la BD y, por tanto, en este listado. */
const SAVED_NOTICE = {
  title: "Borrador guardado",
  description: "Está en el listado con el estado «Borrador». Aún no es visible para el público.",
};

/**
 * "Mis eventos": listado completo con filtro de estado y búsqueda, ambos en el servidor (`useManagedEvents`). El estado
 * filtra al cambiar; la búsqueda, al enviar el formulario (las server actions van de una en una: no se pide por tecla).
 */
export function OrganizerEventsList({
  userId,
  initialEvents,
  showOrganizer,
  canMutate = false,
  saved,
}: OrganizerEventsListProps) {
  const [filters, setFilters] = useState<ManagedEventsFilters>(DEFAULT_MANAGED_EVENTS_FILTERS);
  const [showSaved, setShowSaved] = useState(saved !== undefined);
  const [deleted, setDeleted] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget>({ event: null, open: false });
  const headingId = useId();
  const statusId = useId();
  const searchId = useId();
  // Filtros con los que el servidor trae `initialEvents`: sus datos solo valen para ellos.
  const isDefault =
    filters.status === DEFAULT_MANAGED_EVENTS_FILTERS.status && filters.q === DEFAULT_MANAGED_EVENTS_FILTERS.q;
  const { data: events = [], isError, isPlaceholderData } = useManagedEvents(
    userId,
    filters,
    isDefault ? initialEvents : undefined,
  );

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    setFilters((current) => ({ ...current, q }));
  }

  // Solo los borradores se editan o eliminan (F5a); la moderación (F5b) añadirá acciones para el resto de estados.
  const rowActions = canMutate
    ? (event: ManagedEvent) =>
        event.status === "draft" ? (
          <DraftEventActions
            event={event}
            onDelete={() => {
              setShowSaved(false);
              setDeleted(null);
              setDeleting({ event, open: true });
            }}
          />
        ) : null
    : undefined;

  return (
    <div className="flex flex-col">
      {/* Región viva siempre presente: el aviso de eliminar se anuncia al aparecer. */}
      <div aria-live="polite" aria-atomic="true">
        {(showSaved || deleted) && (
          // Sin role="alert": la región viva ya lo anuncia.
          <Alert role={undefined} className="mb-4 py-3 pr-14 pl-4 md:mb-5">
            <CircleCheck aria-hidden />
            <AlertTitle className="font-bold">{deleted ? `Borrador «${deleted}» eliminado` : SAVED_NOTICE.title}</AlertTitle>
            {!deleted && <AlertDescription>{SAVED_NOTICE.description}</AlertDescription>}
            <AlertAction className="top-1 right-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-11 cursor-pointer"
                aria-label="Cerrar aviso"
                onClick={() => {
                  setShowSaved(false);
                  setDeleted(null);
                }}
              >
                <X className="size-5" aria-hidden />
              </Button>
            </AlertAction>
          </Alert>
        )}
      </div>

      <section
        aria-labelledby={headingId}
        aria-busy={isPlaceholderData}
        className="flex flex-col gap-3 lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:bg-card lg:ring-1 lg:ring-border"
      >
        <div className="flex flex-col gap-4 lg:border-b lg:px-6 lg:py-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id={headingId} className="text-lg font-bold">
              Listado
            </h2>
            <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
              {events.length === 1 ? "1 evento" : `${formatCount(events.length)} eventos`}
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={statusId}>Estado</Label>
              <NativeSelect
                id={statusId}
                value={filters.status}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, status: event.target.value as ManagedEventsStatusFilter }))
                }
                className={SELECT_CLASS}
              >
                <NativeSelectOption value="all">Todos los estados</NativeSelectOption>
                {STATUS_OPTIONS.map(({ value, label }) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <form role="search" onSubmit={handleSearch} className="flex min-w-0 flex-1 flex-col gap-1.5">
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
                    placeholder="Título, recinto o ciudad"
                    className="h-11 bg-background pl-9"
                  />
                </div>
                <Button type="submit" variant="outline" className="h-11 cursor-pointer px-4 font-semibold">
                  Buscar
                </Button>
              </div>
            </form>
          </div>
        </div>

        {isError && (
          <p role="alert" className="rounded-2xl bg-card p-4 text-sm text-destructive ring-1 ring-border lg:m-6 lg:mb-0">
            No pudimos cargar los eventos. Inténtalo de nuevo.
          </p>
        )}

        {events.length > 0 ? (
          <OrganizerEventsTable
            events={events}
            labelledBy={headingId}
            showOrganizer={showOrganizer}
            rowActions={rowActions}
          />
        ) : (
          // Con error ya lo dice el aviso: una lista vacía no significa "sin resultados".
          !isError && (
            <p className="rounded-2xl bg-card p-8 text-center text-muted-foreground ring-1 ring-border lg:m-6 lg:bg-muted lg:ring-0">
              {isDefault ? "Aún no tienes eventos." : "No hay eventos con estos filtros."}
            </p>
          )
        )}
      </section>

      <DeleteEventDialog
        userId={userId}
        event={deleting.event}
        open={deleting.open}
        onOpenChange={(open) => setDeleting((current) => ({ ...current, open }))}
        onDeleted={(title) => {
          setDeleting((current) => ({ ...current, open: false }));
          setDeleted(title);
        }}
      />
    </div>
  );
}
