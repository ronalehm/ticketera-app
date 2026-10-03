import type { z } from "zod";
import { formatSeatId, type venueLayoutSchema } from "../schemas/seating.schema";

type VenueLayoutInput = z.input<typeof venueLayoutSchema>;
type ZoneLayoutInput = VenueLayoutInput["zones"][number];
type SeatRowInput = Extract<ZoneLayoutInput, { kind: "numbered" }>["rows"][number];

export type VenueRecord = {
  eventSlug: string;
  mapViewBox: string | null;
  stage: { label: string; path: string; labelPos: { x: number; y: number } } | null;
};

export type ZoneRecord = {
  sectionSlug: string;
  ticketTypeSlug: string;
  seating: "general" | "numbered";
  capacity: number | null;
  mapPath: string | null;
  labelX: number | null;
  labelY: number | null;
  seatViewBox: string | null;
};

export type SeatRecord = {
  sectionSlug: string;
  rowLabel: string;
  number: number;
  x: number;
  y: number;
  accessible: boolean;
  available: boolean;
};

/** Agrupa los asientos de una sección en filas, en el orden recibido (el de la consulta). */
function toSeatRows(sectionSlug: string, seats: SeatRecord[]): SeatRowInput[] {
  const rows = new Map<string, SeatRowInput>();
  for (const seat of seats) {
    if (seat.sectionSlug !== sectionSlug) continue;
    let row = rows.get(seat.rowLabel);
    if (!row) {
      row = { label: seat.rowLabel, seats: [] };
      rows.set(seat.rowLabel, row);
    }
    row.seats.push({
      id: formatSeatId(sectionSlug, seat.rowLabel, seat.number),
      row: seat.rowLabel,
      number: seat.number,
      x: seat.x,
      y: seat.y,
      status: !seat.available ? "occupied" : seat.accessible ? "accessible" : "available",
    });
  }
  return [...rows.values()];
}

function toZone(zone: ZoneRecord & { mapPath: string }, seats: SeatRecord[]): ZoneLayoutInput {
  if (zone.labelX === null || zone.labelY === null) {
    throw new Error(`La sección ${zone.sectionSlug} tiene map_path pero no label_x/label_y`);
  }
  const base = {
    id: zone.sectionSlug,
    ticketTypeId: zone.ticketTypeSlug,
    path: zone.mapPath,
    labelPos: { x: zone.labelX, y: zone.labelY },
  };

  if (zone.seating === "general") {
    if (zone.capacity === null) throw new Error(`La sección general ${zone.sectionSlug} no tiene capacity`);
    return { ...base, kind: "general", capacity: zone.capacity };
  }
  if (zone.seatViewBox === null) throw new Error(`La sección numerada ${zone.sectionSlug} no tiene seat_view_box`);
  return { ...base, kind: "numbered", seatViewBox: zone.seatViewBox, rows: toSeatRows(zone.sectionSlug, seats) };
}

/**
 * Filas de la BD → layout del recinto (sin validar: lo valida el service con `venueLayoutSchema`).
 * `null` si el recinto no tiene geometría o alguna zona no tiene `map_path` (Decisión 10).
 */
export function toVenueLayout(venue: VenueRecord, zones: ZoneRecord[], seats: SeatRecord[]): VenueLayoutInput | null {
  if (!venue.mapViewBox || !venue.stage) return null;
  if (!zones.every((zone): zone is ZoneRecord & { mapPath: string } => zone.mapPath !== null)) return null;

  return {
    eventSlug: venue.eventSlug,
    viewBox: venue.mapViewBox,
    stage: venue.stage,
    zones: zones.map((zone) => toZone(zone, seats)),
  };
}
