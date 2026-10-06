import { and, eq, gt, inArray, or, type SQL, sql } from "drizzle-orm";
import { orders } from "@/lib/db/schema/sales";

/**
 * Condición SQL de una orden que cuenta como **venta activa** (spec admin-panel, Decisiones 11 y 12): `paid` o
 * `partially_refunded` (aún tienen entradas válidas) y `pending` vigente (`expires_at > now()`, una reserva en curso).
 * Única definición para bloquear los cambios sensibles y la cancelación de un evento, y para que `db:seed` no desplace
 * su fecha. Se combina con el filtro del evento: `and(eq(orders.eventId, id), isActiveSaleOrder)`.
 */
export const isActiveSaleOrder: SQL = or(
  inArray(orders.status, ["paid", "partially_refunded"]),
  and(eq(orders.status, "pending"), gt(orders.expiresAt, sql`now()`)),
) as SQL;
