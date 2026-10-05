import type { z } from "zod";
import type { ManagedEventsFilters } from "@/modules/events";
import type {
  organizerEventFormSchema,
  organizerEventSchema,
  organizerEventStatusSchema,
  savedStatusSchema,
  seatingModeSchema,
  ticketTypeKindSchema,
} from "../schemas/organizer.schema";

export type OrganizerEvent = z.infer<typeof organizerEventSchema>;
export type OrganizerEventStatus = z.infer<typeof organizerEventStatusSchema>;
/** Filtro de estado del panel: `all` o un estado de `event_status`. */
export type ManagedEventsStatusFilter = ManagedEventsFilters["status"];
/** KPIs de Resumen: ventas brutas MVP (órdenes `paid`, Decisión 10), entradas vendidas y eventos publicados. */
export type DashboardKpis = { revenueCents: number; ticketsSold: number; publishedCount: number };

/** "publicado" | "borrador" | undefined */
export type SavedStatus = z.infer<typeof savedStatusSchema>;
export type OrganizerEventFormValues = z.input<typeof organizerEventFormSchema>;
export type TicketTypeRow = OrganizerEventFormValues["ticketTypes"][number];
export type TicketTypeKind = z.infer<typeof ticketTypeKindSchema>;
/** "general" | "numbered" | "mixed": cómo se ubica el público del evento. */
export type SeatingMode = z.infer<typeof seatingModeSchema>;
export type TicketTypeRowErrors = Partial<
  Record<"name" | "price" | "description" | "maxPerOrder" | "quantity" | "rows" | "seatsPerRow", string>
>;
/** Filas y asientos por fila de una zona numerada válida. */
export type SeatGridSize = { rows: number; seatsPerRow: number };

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
