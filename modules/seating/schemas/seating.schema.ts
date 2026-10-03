import { z } from "zod";
import { MAX_TICKETS_PER_ORDER } from "@/modules/events/purchase";

/** `<zoneId>-<fila>-<número>` (p. ej. `norte-F-12`). Se lee desde la derecha: el `zoneId` puede llevar guiones. */
export const SEAT_ID_PATTERN = /^([a-z0-9]+(?:-[a-z0-9]+)*)-([A-Z]{1,2})-(\d{1,3})$/;

// Vive aquí (y `utils/seatIds` lo reexporta) para que el schema no importe utils que a su vez importan el schema.
export function formatSeatId(zoneId: string, row: string, number: number): string {
  return `${zoneId}-${row}-${number}`;
}

export const seatRowLabelSchema = z.string().regex(/^[A-Z]{1,2}$/);
export const seatStatusSchema = z.enum(["available", "occupied", "accessible"]);
export const seatSchema = z.object({
  id: z.string(),
  row: seatRowLabelSchema,
  number: z.number().int().min(1).max(999),
  x: z.number(),
  y: z.number(),
  status: seatStatusSchema,
});
export const seatRowSchema = z.object({ label: seatRowLabelSchema, seats: seatSchema.array().min(1) });

const pointSchema = z.object({ x: z.number(), y: z.number() });
const viewBoxSchema = z.string().regex(/^0 0 \d+ \d+$/);
const kebabIdSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

const zoneLayoutBaseSchema = z.object({
  id: kebabIdSchema,
  ticketTypeId: kebabIdSchema,
  path: z.string().min(1),
  labelPos: pointSchema,
});

export const venueZoneLayoutSchema = z.discriminatedUnion("kind", [
  zoneLayoutBaseSchema.extend({ kind: z.literal("general"), capacity: z.number().int().positive() }),
  zoneLayoutBaseSchema.extend({
    kind: z.literal("numbered"),
    seatViewBox: viewBoxSchema,
    rows: seatRowSchema.array().min(1),
  }),
]);

function findDuplicates(values: (string | number)[]) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

export const venueLayoutSchema = z
  .object({
    eventSlug: z.string().min(1),
    viewBox: viewBoxSchema,
    stage: z.object({ label: z.string().min(1), path: z.string().min(1), labelPos: pointSchema }),
    zones: venueZoneLayoutSchema.array().min(1),
  })
  .superRefine((layout, ctx) => {
    for (const id of findDuplicates(layout.zones.map((zone) => zone.id))) {
      ctx.addIssue({ code: "custom", path: ["zones"], message: `Zona duplicada: ${id}` });
    }
    for (const id of findDuplicates(layout.zones.map((zone) => zone.ticketTypeId))) {
      ctx.addIssue({ code: "custom", path: ["zones"], message: `ticketTypeId duplicado: ${id}` });
    }

    layout.zones.forEach((zone, zoneIndex) => {
      if (zone.kind !== "numbered") return;
      const rowsPath = ["zones", zoneIndex, "rows"];

      for (const label of findDuplicates(zone.rows.map((row) => row.label))) {
        ctx.addIssue({ code: "custom", path: rowsPath, message: `Fila duplicada en ${zone.id}: ${label}` });
      }

      zone.rows.forEach((row, rowIndex) => {
        const seatsPath = [...rowsPath, rowIndex, "seats"];
        for (const number of findDuplicates(row.seats.map((seat) => seat.number))) {
          ctx.addIssue({ code: "custom", path: seatsPath, message: `Asiento duplicado en la fila ${row.label}: ${number}` });
        }
        row.seats.forEach((seat, seatIndex) => {
          if (seat.row !== row.label) {
            ctx.addIssue({ code: "custom", path: [...seatsPath, seatIndex, "row"], message: `El asiento ${seat.id} no es de la fila ${row.label}` });
          }
          if (seat.id !== formatSeatId(zone.id, row.label, seat.number)) {
            ctx.addIssue({ code: "custom", path: [...seatsPath, seatIndex, "id"], message: `Id de asiento inválido: ${seat.id}` });
          }
        });
      });
    });
  });

export const seatIdSchema = z.string().regex(SEAT_ID_PATTERN);

/** Valor de `asientos` en la URL: ids separados por comas, sin duplicados, de 1 a `MAX_TICKETS_PER_ORDER`. */
export const seatIdsParamSchema = z
  .string()
  .transform((value) => value.split(","))
  .pipe(seatIdSchema.array().min(1).max(MAX_TICKETS_PER_ORDER))
  .refine((ids) => new Set(ids).size === ids.length);
