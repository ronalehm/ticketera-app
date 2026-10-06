import type { z } from "zod";
import type { EventCategory, ManagedEventsFilters, ManagedEventStatus } from "@/modules/events";
import type { CITIES } from "@/modules/events/format";
import type {
  createEventDraftSchema,
  eventDraftTicketTypeSchema,
  manualVenueFormSchema,
  savedStatusSchema,
} from "../schemas/organizer.schema";
import type { EventDraftErrorCode } from "../utils/eventDraftError";

/** Filtro de estado del panel: `all` o un estado de `event_status`. */
export type ManagedEventsStatusFilter = ManagedEventsFilters["status"];
/** KPIs de Eventos (`/organizador`): ventas brutas MVP (órdenes `paid`, Decisión 10), entradas vendidas y eventos publicados. */
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
/** Bloque «Mi recinto no está en la lista» del formulario (spec organizer-manual-venue, Decisión 3). */
export type ManualVenueFormValues = z.input<typeof manualVenueFormSchema>;
/** Primer mensaje por campo del bloque manual y de cada zona (mismas reglas que el schema). */
export type ManualVenueErrors = {
  name?: string;
  address?: string;
  city?: string;
  /** Sin zonas, demasiadas o con nombres repetidos. */
  sections?: string;
  sectionRows: { name?: string; capacity?: string }[];
};

/** Recinto ingresado a mano: se guarda `pending_review` con sus zonas generales (Decisión 4). */
export type ManualVenueInput = {
  kind: "manual";
  name: string;
  address: string;
  city: (typeof CITIES)[number];
  /** `id`: uuid de la zona (nuevo, generado en el cliente, o el de una zona ya guardada); los tipos de entrada lo usan. */
  sections: { id: string; name: string; capacity: number }[];
};

/** Borrador listo para la BD (`toEventDraftInput`): lo recibe el servicio. */
export type EventDraftInput = {
  title: string;
  category: EventCategory["slug"];
  description: string | null;
  startsAt: Date | null;
  doorsOpenAt: Date | null;
  minAge: number;
  /** Recinto de la lista (aprobado o pendiente del propio organizador) o ingresado a mano; `null` sin recinto. */
  venue: { kind: "existing"; id: string } | ManualVenueInput | null;
  imageUrl: string | null;
  /** Organizador elegido por admin o super_admin; `null` si no se indicó (para un organizador, siempre él mismo). */
  organizerId: string | null;
  ticketTypes: { sectionId: string; name: string; priceCents: number; sortOrder: number }[];
};

/** Sección de un recinto en el formulario, con su capacidad (general: lugares; numerada: asientos). */
export type VenueSectionOption = { id: string; name: string; seating: "general" | "numbered"; capacity: number };
/**
 * Recinto para el Select del formulario, con su dirección y sus secciones en orden: aprobado o pendiente
 * (`pending_review`) de `organizerId` (spec organizer-manual-venue, Decisiones 3b y 5).
 */
export type VenueOption = {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
  status: "approved" | "pending_review";
  /** Organizador dueño: siempre en uno pendiente; uno aprobado es compartido aunque lo conserve (o `null`). */
  organizerId: string | null;
  sections: VenueSectionOption[];
};
/** Organizador aprobado para el Select del admin: razón social o, sin ella, el nombre. */
export type OrganizerOption = { id: string; name: string };

/** Evento que se precarga en Editar (`getEventForEdit`), serializable: fechas en ISO 8601 y precios en céntimos. */
export type EditableEvent = {
  id: string;
  status: ManagedEventStatus;
  organizerId: string;
  title: string;
  category: EventCategory["slug"];
  description: string | null;
  startsAt: string | null;
  doorsOpenAt: string | null;
  minAge: number;
  venueId: string | null;
  imageUrl: string | null;
  ticketTypes: { sectionId: string; name: string; priceCents: number }[];
  /** Motivo del último rechazo (lo ve el organizador en su borrador); `null` si no lo hay. */
  reviewNote: string | null;
  /** Destacado en la landing (solo lo cambia un admin, `EventFeaturedControl`). */
  featured: boolean;
  /** Ventas activas (órdenes `paid`, `partially_refunded` o `pending` vigentes, `lib/db/activeSales.ts`). */
  hasSales: boolean;
  /** Entradas vendidas (órdenes `paid`): la confirmación al cambiar la fecha de un publicado (spec event-editing). */
  sold: number;
};

/**
 * Campos bloqueados al editar un evento publicado, con o sin ventas (spec event-editing, Decisión 1): `structure`
 * (recinto, secciones a la venta y organizador).
 */
export type EventFormLock = "structure";

/** Fallo de una acción de borradores: mensaje en español y `code` si es un error de dominio. */
export type EventDraftActionFailure = { ok: false; error: string; code?: EventDraftErrorCode };
export type EventDraftActionResult<T extends object = object> = ({ ok: true } & T) | EventDraftActionFailure;

/** Datos de la tarjeta de vista previa; `null` = marcador por falta de datos. */
export type EventPreview = {
  title: string | null;
  /** Nombre de la categoría elegida; `null` si aún no se eligió. */
  categoryLabel: string | null;
  /** Fecha corta de la tarjeta ("sáb 5 dic"). */
  dateLabel: string | null;
  /** Partes del chip de fecha ({ month: "DIC", day: "05" }). */
  dateChip: { month: string; day: string } | null;
  /** Lugar y ciudad ("Estadio Nacional · Lima"). */
  place: string | null;
  priceFrom: number | null;
  imageUrl: string | null;
};
