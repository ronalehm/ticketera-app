import { formatCount } from "@/lib/formatNumber";
import { formatEventPrice } from "@/modules/events/format";
import { getSeatRowLabels } from "@/modules/seating/preview";
import { COVER_IMAGE_RULES, formDateSchema, formTimeSchema, ticketTypeFormSchema } from "../schemas/organizer.schema";
import type {
  OrganizerEvent,
  OrganizerEventFormValues,
  SeatGridSize,
  SeatingMode,
  TicketTypeKind,
  TicketTypeRow,
  TicketTypeRowErrors,
} from "../types/organizer.types";

// Perú no tiene horario de verano: el offset de America/Lima es siempre -05:00.
const LIMA_OFFSET = "-05:00";

// Mismas reglas por campo que al publicar (ticketTypeFormSchema), para no duplicarlas aquí.
const [generalRowSchema, numberedRowSchema] = ticketTypeFormSchema.options;
const { price: priceSchema, quantity: quantitySchema } = generalRowSchema.shape;
const { rows: rowsSchema, seatsPerRow: seatsPerRowSchema } = numberedRowSchema.shape;

/** Fila vacía del tipo indicado, con el máximo por compra en 10 (decisión 7). */
export function createTicketTypeRow(kind: TicketTypeKind = "general"): TicketTypeRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    price: "",
    description: "",
    maxPerOrder: "10",
    kind,
    quantity: "",
    rows: "",
    seatsPerRow: "",
  };
}

/** Tipo de una fila nueva: numerada solo en "Con mapa de asientos"; general en los demás modos y sin modo. */
export function getNewRowKind(mode: SeatingMode | ""): TicketTypeKind {
  return mode === "numbered" ? "numbered" : "general";
}

/**
 * Filas según el modo de ubicación (decisión 3): "general" y "numbered" fuerzan el `kind` de todas; "mixed" lo deja.
 * Solo cambia `kind`: los valores del otro tipo se conservan, así que volver atrás no pierde datos.
 */
export function applySeatingMode(rows: TicketTypeRow[], mode: SeatingMode): TicketTypeRow[] {
  return rows.map((row) => ({ ...row, kind: mode === "mixed" ? row.kind : mode }));
}

/** Filas y asientos por fila de una zona numerada si ambos son enteros dentro de los límites; si no, `null`. */
export function getSeatGridSize(row: TicketTypeRow): SeatGridSize | null {
  if (row.kind !== "numbered") return null;
  const rows = rowsSchema.safeParse(row.rows);
  const seatsPerRow = seatsPerRowSchema.safeParse(row.seatsPerRow);
  if (!rows.success || !seatsPerRow.success) return null;
  return { rows: Number(rows.data), seatsPerRow: Number(seatsPerRow.data) };
}

/** Entradas de una zona: la cantidad (general) o filas × asientos (numerada); `null` si no es válida. */
export function getRowCapacity(row: TicketTypeRow): number | null {
  if (row.kind === "general") {
    const result = quantitySchema.safeParse(row.quantity);
    return result.success ? Number(result.data) : null;
  }
  const size = getSeatGridSize(row);
  return size ? size.rows * size.seatsPerRow : null;
}

/** Suma de la capacidad de cada zona; las filas vacías o inválidas no cuentan. */
export function getTicketCapacity(rows: TicketTypeRow[]): number {
  return rows.reduce((total, row) => total + (getRowCapacity(row) ?? 0), 0);
}

/** Pie de la vista previa del plano: "Filas A–J · 20 asientos por fila · S/ 120.00 c/u". Sin precio, sin el último tramo. */
export function formatSeatGridSummary(size: SeatGridSize, price: number | null): string {
  const labels = getSeatRowLabels(size.rows);
  const parts = [
    labels.length === 1 ? `Fila ${labels[0]}` : `Filas ${labels[0]}–${labels[labels.length - 1]}`,
    `${size.seatsPerRow} ${size.seatsPerRow === 1 ? "asiento" : "asientos"} por fila`,
  ];
  if (price === 0) parts.push("Entrada libre");
  else if (price !== null) parts.push(`${formatEventPrice(price)} c/u`);
  return parts.join(" · ");
}

/** Menor precio válido (≥ 0) o `null` si ninguna fila tiene un precio válido. */
export function getMinTicketPrice(rows: TicketTypeRow[]): number | null {
  const prices = rows.flatMap((row) => {
    const result = priceSchema.safeParse(row.price);
    return result.success ? [Number(result.data)] : [];
  });
  return prices.length > 0 ? Math.min(...prices) : null;
}

/** 1 → "1 entrada"; 1500 → "1,500 entradas". */
export function formatTicketCount(n: number): string {
  return n === 1 ? "1 entrada" : `${formatCount(n)} entradas`;
}

/** "2026-12-05" + "20:00" → "2026-12-05T20:00:00-05:00"; `null` si falta o no es válida la fecha o la hora. */
export function buildStartsAt(date: string, time: string): string | null {
  if (!formDateSchema.safeParse(date).success || !formTimeSchema.safeParse(time).success) return null;
  return `${date}T${time}:00${LIMA_OFFSET}`;
}

/** Primer mensaje por campo de cada fila, con las mismas reglas que el formulario al publicar. */
export function getTicketTypeErrors(rows: TicketTypeRow[]): TicketTypeRowErrors[] {
  return rows.map((row) => {
    const result = ticketTypeFormSchema.safeParse(row);
    const errors: TicketTypeRowErrors = {};
    if (result.success) return errors;
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof TicketTypeRowErrors;
      errors[field] ??= issue.message;
    }
    return errors;
  });
}

/** Evento del panel a partir del formulario. Un borrador guarda solo lo interpretable. La portada no se persiste. */
export function toOrganizerEvent(values: OrganizerEventFormValues, id: string): OrganizerEvent {
  return {
    id,
    title: values.name.trim(),
    category: values.category,
    startsAt: buildStartsAt(values.date, values.time),
    venue: values.venue.trim(),
    city: values.city.trim(),
    imageUrl: null,
    priceFrom: getMinTicketPrice(values.ticketTypes),
    sold: 0,
    capacity: getTicketCapacity(values.ticketTypes),
    status: values.intent === "publish" ? "published" : "draft",
  };
}

/** Tipos MIME aceptados para la portada (JPG o PNG): los usan la validación y el `accept` del input. */
export const ACCEPTED_COVER_IMAGE_TYPES: readonly string[] = ["image/png", "image/jpeg"];

/** Peso máximo de la portada en MB, para los textos. */
export const MAX_COVER_MEGABYTES = COVER_IMAGE_RULES.maxBytes / (1024 * 1024);

/**
 * Primer error de una portada, en orden: tipo (JPG o PNG), peso, lectura y tamaño mínimo. `null` si es válida.
 * El tamaño se lee con `createImageBitmap`, que se cierra tras leerlo.
 */
export async function getCoverImageError(file: File): Promise<string | null> {
  if (!ACCEPTED_COVER_IMAGE_TYPES.includes(file.type)) return "Sube una imagen en formato JPG o PNG.";
  if (file.size > COVER_IMAGE_RULES.maxBytes) {
    return `La imagen pesa más de ${MAX_COVER_MEGABYTES} MB. Sube una más liviana.`;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return "No se pudo leer la imagen. Prueba con otro archivo.";
  }
  const { width, height } = bitmap;
  bitmap.close();

  if (width < COVER_IMAGE_RULES.minWidth || height < COVER_IMAGE_RULES.minHeight) {
    return `La imagen debe medir al menos ${COVER_IMAGE_RULES.minWidth} × ${COVER_IMAGE_RULES.minHeight} px.`;
  }
  return null;
}
