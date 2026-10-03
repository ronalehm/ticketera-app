import type { VenueZone, ZoneTone } from "../types/seating.types";

const PRICE_TIERS = ["tier-1", "tier-2", "tier-3", "tier-4", "tier-5"] as const satisfies readonly ZoneTone[];

/**
 * Tono de cada zona según su rango de precio entre las zonas no agotadas (de mayor a menor).
 * Precios iguales comparten tono; desde el 5.º precio distinto todos usan `tier-5`.
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

/**
 * Clases por tono (escala de azules Mentec, decisión 28): forma SVG, texto sobre la forma y muestra en listas.
 * `label` lleva la clase SVG (`fill-`) y la HTML (`text-`), para el texto SVG y las etiquetas HTML del mapa.
 */
export const ZONE_TONE_CLASSES: Record<ZoneTone, { shape: string; label: string; swatch: string }> = {
  "tier-1": { shape: "fill-brand-navy", label: "fill-background text-background", swatch: "bg-brand-navy" },
  "tier-2": {
    shape: "fill-primary-strong",
    label: "fill-primary-foreground text-primary-foreground",
    swatch: "bg-primary-strong",
  },
  "tier-3": { shape: "fill-primary/65", label: "fill-foreground text-foreground", swatch: "bg-primary/65" },
  "tier-4": { shape: "fill-primary/40", label: "fill-foreground text-foreground", swatch: "bg-primary/40" },
  "tier-5": { shape: "fill-primary/20", label: "fill-foreground text-foreground", swatch: "bg-primary/20" },
  "sold-out": {
    shape: "fill-secondary",
    label: "fill-muted-foreground text-muted-foreground",
    swatch: "bg-secondary ring-1 ring-input",
  },
};
