import type { z } from "zod";
import type { EventCategory, ManagedEventsFilters, ManagedEventStatus } from "@/modules/events";
import type {
  createEventDraftSchema,
  eventDraftTicketTypeSchema,
  savedStatusSchema,
} from "../schemas/organizer.schema";
import type { EventDraftErrorCode } from "../utils/eventDraftError";

/** Filtro de estado del panel: `all` o un estado de `event_status`. */
export type ManagedEventsStatusFilter = ManagedEventsFilters["status"];
/** KPIs de Resumen: ventas brutas MVP (órdenes `paid`, Decisión 10), entradas vendidas y eventos publicados. */
export type DashboardKpis = { revenueCents: number; ticketsSold: number; publishedCount: number };

/** "borrador" | undefined */
export type SavedStatus = z.infer<typeof savedStatusSchema>;

type EventDraftSchema = ReturnType<typeof createEventDraftSchema>;
/** Valores del formulario de borrador (y entrada de `createEventAction`/`updateEventAction`). */
export type EventDraftFormValues = z.input<EventDraftSchema>;
/** Valores ya validados (textos recortados). */
export type EventDraftValues = z.output<EventDraftSchema>;
export type TicketTypeRow = z.input<typeof eventDraftTicketTypeSchema>;
export type TicketTypeRowErrors = { name?: string; price?: string };

/** Borrador listo para la BD (`toEventDraftInput`): lo recibe el servicio. */
export type EventDraftInput = {
  title: string;
  category: EventCategory;
  description: string | null;
  startsAt: Date | null;
  doorsOpenAt: Date | null;
  minAge: number;
  venueId: string | null;
  imageUrl: string | null;
  /** Organizador elegido por admin o super_admin; `null` si no se indicó (para un organizador, siempre él mismo). */
  organizerId: string | null;
  ticketTypes: { sectionId: string; name: string; priceCents: number; sortOrder: number }[];
};

/** Sección de un recinto en el formulario, con su capacidad (general: lugares; numerada: asientos). */
export type VenueSectionOption = { id: string; name: string; seating: "general" | "numbered"; capacity: number };
/** Recinto aprobado para el Select del formulario, con sus secciones en orden. */
export type VenueOption = { id: string; name: string; city: string; sections: VenueSectionOption[] };
/** Organizador aprobado para el Select del admin: razón social o, sin ella, el nombre. */
export type OrganizerOption = { id: string; name: string };

/** Evento que se precarga en Editar (`getEventForEdit`), serializable: fechas en ISO 8601 y precios en céntimos. */
export type EditableEvent = {
  id: string;
  status: ManagedEventStatus;
  organizerId: string;
  title: string;
  category: EventCategory;
  description: string | null;
  startsAt: string | null;
  doorsOpenAt: string | null;
  minAge: number;
  venueId: string | null;
  imageUrl: string | null;
  ticketTypes: { sectionId: string; name: string; priceCents: number }[];
};

/** Fallo de una acción de borradores: mensaje en español y `code` si es un error de dominio. */
export type EventDraftActionFailure = { ok: false; error: string; code?: EventDraftErrorCode };
export type EventDraftActionResult<T extends object = object> = ({ ok: true } & T) | EventDraftActionFailure;

/** Datos de la tarjeta de vista previa; `null` = marcador por falta de datos. */
export type EventPreview = {
  title: string | null;
  categoryLabel: string;
  /** Fecha corta de la tarjeta ("sáb 5 dic"). */
  dateLabel: string | null;
  /** Partes del chip de fecha ({ month: "DIC", day: "05" }). */
  dateChip: { month: string; day: string } | null;
  /** Lugar y ciudad ("Estadio Nacional · Lima"). */
  place: string | null;
  priceFrom: number | null;
  imageUrl: string | null;
};
