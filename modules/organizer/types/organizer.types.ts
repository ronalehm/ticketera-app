import type { z } from "zod";
import type {
  organizerEventFormSchema,
  organizerEventSchema,
  organizerEventStatusSchema,
  savedStatusSchema,
} from "../schemas/organizer.schema";

export type OrganizerEvent = z.infer<typeof organizerEventSchema>;
export type OrganizerEventStatus = z.infer<typeof organizerEventStatusSchema>;
export type OrganizerEventFilter = "all" | OrganizerEventStatus;
export type DashboardKpis = { revenue: number; ticketsSold: number; publishedCount: number };

/** "publicado" | "borrador" | undefined */
export type SavedStatus = z.infer<typeof savedStatusSchema>;
export type OrganizerEventFormValues = z.input<typeof organizerEventFormSchema>;
export type TicketTypeRow = OrganizerEventFormValues["ticketTypes"][number];
export type TicketTypeRowErrors = Partial<Record<"name" | "price" | "quantity", string>>;

/** Datos de la tarjeta de vista previa (Fase 3); `null` = marcador por falta de datos. */
export type EventPreview = {
  title: string | null;
  categoryLabel: string;
  dateLabel: string | null;
  place: string | null;
  priceFrom: number | null;
  imageUrl: string | null;
};
