import { eq, inArray } from "drizzle-orm";
import type { db } from "@/lib/db/client";
import { eventSeats, ticketTypes } from "@/lib/db/schema/events";
import { venueSeats, venueSections } from "@/lib/db/schema/venues";

// Inventario de un evento (`event_seats`): un lugar por cada plaza de las secciones que vende. Única regla para el seed
// (a partir de los mocks) y para aprobar un evento en el panel (a partir del recinto guardado en la BD):
// - sección general: `capacity` lugares sin butaca (`venue_seat_id` NULL);
// - sección numerada: un lugar por butaca (`venue_seats`).
// Todos nacen `available`, sin orden: es lo que espera la reserva del checkout (`reserveCheckoutOrder`).

/** Lugar del plan: su butaca (`null` en una sección general) y una clave estable dentro del tipo de entrada. */
export type SeatPlan = { venueSeatId: string | null; key: string };

export type EventSeatInsert = typeof eventSeats.$inferInsert;

/** Lugares de una sección general: `capacity` lugares sin butaca, con claves `<key>:<índice>`. */
export const generalSeatPlan = (key: string, capacity: number): SeatPlan[] =>
  Array.from({ length: capacity }, (_, index) => ({ venueSeatId: null, key: `${key}:${index}` }));

/**
 * Filas de `event_seats` de un tipo de entrada a partir de su plan, todas disponibles. `idFor` da un id determinista por
 * clave (el seed, que reescribe las mismas filas en cada ejecución); sin él, el id lo pone la BD.
 */
export function buildEventSeatRows(
  eventId: string,
  ticketTypeId: string,
  plan: SeatPlan[],
  idFor?: (key: string) => string,
): EventSeatInsert[] {
  return plan.map((seat) => ({
    ...(idFor && { id: idFor(seat.key) }),
    eventId,
    ticketTypeId,
    venueSeatId: seat.venueSeatId,
    status: "available",
    orderId: null,
  }));
}

/** Filas por INSERT: 5 parámetros por fila, muy por debajo del límite de 65 535 de Postgres. */
const INSERT_CHUNK_SIZE = 1000;

type Database = Pick<typeof db, "select" | "insert">;

/**
 * Genera todo el inventario del evento a partir de sus tipos de entrada y de las secciones del recinto a las que
 * pertenecen (numeradas por `venue_seats`, generales por `capacity`). Devuelve cuántos lugares creó. Quien llama lo
 * ejecuta en su transacción y garantiza que el evento aún no tiene inventario activo.
 */
export async function insertEventInventory(database: Database, eventId: string): Promise<number> {
  const types = await database
    .select({
      id: ticketTypes.id,
      sectionId: venueSections.id,
      seating: venueSections.seating,
      capacity: venueSections.capacity,
    })
    .from(ticketTypes)
    .innerJoin(venueSections, eq(venueSections.id, ticketTypes.sectionId))
    .where(eq(ticketTypes.eventId, eventId))
    .orderBy(ticketTypes.sortOrder, ticketTypes.id);

  const numberedSectionIds = types.filter((type) => type.seating === "numbered").map((type) => type.sectionId);
  const seats =
    numberedSectionIds.length > 0
      ? await database
          .select({ id: venueSeats.id, sectionId: venueSeats.sectionId })
          .from(venueSeats)
          .where(inArray(venueSeats.sectionId, numberedSectionIds))
          .orderBy(venueSeats.rowLabel, venueSeats.number)
      : [];

  const rows = types.flatMap((type) => {
    const plan =
      type.seating === "general"
        ? generalSeatPlan(type.sectionId, type.capacity ?? 0)
        : seats
            .filter((seat) => seat.sectionId === type.sectionId)
            .map((seat) => ({ venueSeatId: seat.id, key: seat.id }));
    return buildEventSeatRows(eventId, type.id, plan);
  });

  for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
    await database.insert(eventSeats).values(rows.slice(start, start + INSERT_CHUNK_SIZE));
  }
  return rows.length;
}
