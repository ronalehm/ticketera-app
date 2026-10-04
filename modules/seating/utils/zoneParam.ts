import type { VenueZone } from "../types/seating.types";

/** Nombre reservado de la URL del paso 1: ningún `ticketType.id` puede llamarse así. */
const ZONE_PARAM = "zona";

/** `/eventos/<slug>/entradas?zona=<zoneId>`: abre directamente el sub-paso 2 de esa zona. */
export function buildZoneEntryHref(slug: string, zoneId: string): string {
  return `/eventos/${slug}/entradas?${new URLSearchParams({ [ZONE_PARAM]: zoneId })}`;
}

/**
 * Zona inicial de la URL: el valor de `zona` si aparece exactamente una vez y es, tal cual, el `id` de una
 * zona no agotada; si no, `null` (se abre el sub-paso 1).
 */
export function parseInitialZoneId(
  zones: Pick<VenueZone, "id" | "status">[],
  params: Pick<URLSearchParams, "getAll">,
): string | null {
  const values = params.getAll(ZONE_PARAM);
  if (values.length !== 1) return null;
  const [zoneId] = values;
  return zones.some((zone) => zone.id === zoneId && zone.status !== "sold-out") ? zoneId : null;
}
