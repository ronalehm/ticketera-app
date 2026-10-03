import type { VenueZone, ZoneTone } from "../types/seating.types";

const PRICE_TIERS = ["tier-1", "tier-2", "tier-3", "tier-4"] as const satisfies readonly ZoneTone[];

/**
 * Tono de cada zona según su rango de precio entre las zonas no agotadas (de mayor a menor).
 * Precios iguales comparten tono; desde el 4.º precio distinto todos usan `tier-4`.
 */
export function getZoneTones(zones: Pick<VenueZone, "id" | "price" | "status">[]): Record<string, ZoneTone> {
  const prices = [
    ...new Set(zones.filter((zone) => zone.status !== "sold-out").map((zone) => zone.price)),
  ].sort((a, b) => b - a);

  return Object.fromEntries(
    zones.map((zone): [string, ZoneTone] => {
      if (zone.status === "sold-out") return [zone.id, "sold-out"];
      const rank = prices.indexOf(zone.price);
      return [zone.id, PRICE_TIERS[Math.min(rank, PRICE_TIERS.length - 1)]];
    }),
  );
}

/** Clases por tono (decisión 9): forma SVG, texto sobre el mapa y muestra en listas. */
export const ZONE_TONE_CLASSES: Record<ZoneTone, { shape: string; label: string; swatch: string }> = {
  "tier-1": { shape: "fill-brand-navy", label: "fill-background", swatch: "bg-brand-navy" },
  "tier-2": { shape: "fill-primary-strong", label: "fill-primary-foreground", swatch: "bg-primary-strong" },
  "tier-3": { shape: "fill-highlight", label: "fill-highlight-foreground", swatch: "bg-highlight" },
  "tier-4": {
    shape: "fill-accent stroke-primary/40",
    label: "fill-foreground",
    swatch: "bg-accent ring-1 ring-primary/40",
  },
  "sold-out": { shape: "fill-secondary", label: "fill-muted-foreground", swatch: "bg-secondary ring-1 ring-input" },
};
