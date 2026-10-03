import type { z } from "zod";
import type { EventStatus } from "@/modules/events";
import type {
  planTransformSchema,
  pointSchema,
  seatRowSchema,
  seatSchema,
  seatStatusSchema,
  venueLayoutSchema,
  venueZoneLayoutSchema,
} from "../schemas/seating.schema";

export type Point = z.infer<typeof pointSchema>;
export type PlanTransform = z.infer<typeof planTransformSchema>;
export type SeatStatus = z.infer<typeof seatStatusSchema>;
export type Seat = z.infer<typeof seatSchema>;
export type SeatRow = z.infer<typeof seatRowSchema>;
export type VenueLayout = z.infer<typeof venueLayoutSchema>;
export type VenueZoneLayout = z.infer<typeof venueZoneLayoutSchema>;
/** Zona del layout completada con nombre, precio y estado de su tipo de entrada. */
export type VenueZone = VenueZoneLayout & { name: string; price: number; status: EventStatus };
export type GeneralVenueZone = Extract<VenueZone, { kind: "general" }>;
export type NumberedVenueZone = Extract<VenueZone, { kind: "numbered" }>;
export type VenueMap = Omit<VenueLayout, "zones"> & { venue: string; zones: VenueZone[] };
export type ResolvedSeat = { id: string; label: string; zoneId: string; ticketTypeId: string };
export type SeatSelection = { quantities: Record<string, number>; seatIds: string[] };
export type SelectionLine = { zoneId: string; name: string; quantity: number; amount: number; seatLabels: string[] };
export type ZoneTone = "tier-1" | "tier-2" | "tier-3" | "tier-4" | "sold-out";
