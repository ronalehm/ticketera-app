// Formateadores del resumen del pedido (puros, sin React ni imports de seating).

/** Contrato C: `<zoneId>-<fila>-<número>`, fila `[A-Z]{1,2}`, número 1–999, leído desde la derecha. */
const SEAT_POSITION_PATTERN = /-([A-Z]{1,2})-(\d{1,3})$/;

/** 1 → "1 entrada", 3 → "3 entradas". */
export function formatTicketCount(count: number): string {
  return `${count} ${count === 1 ? "entrada" : "entradas"}`;
}

/** "tribuna-oriente-L-9" → `{ row: "L", number: 9 }`; `null` si el id no sigue el contrato C. */
export function parseSeatPosition(seatId: string): { row: string; number: number } | null {
  const match = SEAT_POSITION_PATTERN.exec(seatId);
  if (!match) return null;
  const number = Number(match[2]);
  return number === 0 ? null : { row: match[1], number };
}

/** Filas por longitud y luego alfabéticamente: A…Z, AA… */
const compareRows = (a: string, b: string): number => a.length - b.length || a.localeCompare(b);

/**
 * Asientos agrupados por fila: "Fila L · 9, 10 · Fila M · 8".
 * Los ids ilegibles van al final con su `label`. Con `[]` devuelve "".
 */
export function formatCompactSeats(seats: { id: string; label: string }[]): string {
  const numbersByRow = new Map<string, number[]>();
  const fallbackLabels: string[] = [];

  for (const seat of seats) {
    const position = parseSeatPosition(seat.id);
    if (!position) {
      fallbackLabels.push(seat.label);
      continue;
    }
    numbersByRow.set(position.row, [...(numbersByRow.get(position.row) ?? []), position.number]);
  }

  const rows = [...numbersByRow.keys()]
    .sort(compareRows)
    .map((row) => `Fila ${row} · ${numbersByRow.get(row)!.sort((a, b) => a - b).join(", ")}`);

  return [...rows, ...fallbackLabels].join(" · ");
}
