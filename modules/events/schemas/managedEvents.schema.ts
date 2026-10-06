import { z } from "zod";

// Eventos del panel (spec admin-panel, F3): los ve el organizador (los suyos) o el admin (todos), en cualquier estado.

/** Mismos valores que el enum `event_status` de la BD (el test lo compara con `eventStatusEnum`). */
export const managedEventStatusSchema = z.enum(["draft", "pending_review", "published", "cancelled", "finished"]);

/** Filtros de `listManagedEvents`: estado (`all` = todos) y texto libre. Valida la entrada de la server action. */
export const managedEventsFiltersSchema = z.object({
  status: z.union([z.literal("all"), managedEventStatusSchema]).default("all"),
  q: z.string().trim().max(100).default(""),
});

export const managedEventSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  status: managedEventStatusSchema,
  startsAt: z.iso.datetime({ offset: true }).nullable(), // null: borrador sin fecha
  venue: z.string().nullable(), // null: borrador sin recinto
  city: z.string().nullable(),
  imageUrl: z.string().nullable(),
  /** Razón social del organizador o, si aún no la tiene (no aprobado), su nombre. */
  organizer: z.string(),
  /** Entradas de órdenes `paid`. */
  sold: z.number().int().nonnegative(),
  /**
   * Tiene ventas activas (`lib/db/activeSales.ts`: órdenes `paid`, `partially_refunded` o `pending` vigentes). Bloquea
   * cancelar el evento (Decisión 12); `sold` solo cuenta las `paid`.
   */
  hasActiveSales: z.boolean(),
  /** Ventas brutas MVP (Decisión 10): órdenes `paid`; parte del organizador o subtotal para el admin. */
  revenueCents: z.number().int().nonnegative(),
  /** Inventario sin retirar; en un borrador, la capacidad configurada en sus secciones. */
  capacity: z.number().int().nonnegative(),
});
