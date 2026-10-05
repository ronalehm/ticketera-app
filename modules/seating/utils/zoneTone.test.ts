// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { describeWithDb } from "@/lib/db/testDb";
import { sellTestSeats } from "@/lib/db/testFixtures";
import { inRolledBackTransaction } from "@/lib/db/testTransaction";
import { getEventBySlug } from "@/modules/events";
import type { VenueZone, ZoneTone } from "../types/seating.types";
import { getZoneTones, ZONE_TONE_CLASSES } from "./zoneTone";

// Fuera de `inRolledBackTransaction`, el `db` real; dentro, la transacción (que siempre se revierte).
vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"));

type ToneInput = Pick<VenueZone, "id" | "price" | "status">;

function zone(id: string, price: number, status: VenueZone["status"] = "available"): ToneInput {
  return { id, price, status };
}

/** Zonas a partir de los tipos de entrada reales del evento (cada zona usa el id de su tipo). */
async function zonesOf(slug: string): Promise<ToneInput[]> {
  const event = await getEventBySlug(slug);
  if (!event) throw new Error(`Evento inexistente: ${slug}`);
  return event.ticketTypes.map(({ id, price, status }) => ({ id, price, status }));
}

describe("getZoneTones", () => {
  it("asigna los tonos de mayor a menor precio, sin importar el orden de las zonas", () => {
    expect(getZoneTones([zone("c", 100), zone("a", 300), zone("b", 200)])).toEqual({
      a: "tier-1",
      b: "tier-2",
      c: "tier-3",
    });
  });

  it("da el mismo tono a precios iguales y cuenta precios distintos, no zonas", () => {
    expect(getZoneTones([zone("a", 300), zone("b", 300), zone("c", 200), zone("d", 100)])).toEqual({
      a: "tier-1",
      b: "tier-1",
      c: "tier-2",
      d: "tier-3",
    });
  });

  it("con 5 precios distintos asigna tier-1…tier-5", () => {
    expect(
      getZoneTones([zone("e", 100), zone("a", 500), zone("c", 300), zone("b", 400), zone("d", 200)]),
    ).toEqual({
      a: "tier-1",
      b: "tier-2",
      c: "tier-3",
      d: "tier-4",
      e: "tier-5",
    });
  });

  it("con más de 5 precios distintos, del 5.º en adelante usa tier-5", () => {
    expect(
      getZoneTones([zone("a", 500), zone("b", 400), zone("c", 300), zone("d", 200), zone("e", 100), zone("f", 50)]),
    ).toEqual({
      a: "tier-1",
      b: "tier-2",
      c: "tier-3",
      d: "tier-4",
      e: "tier-5",
      f: "tier-5",
    });
  });

  it("marca las zonas agotadas como sold-out y las excluye del ranking de precios", () => {
    expect(getZoneTones([zone("a", 500, "sold-out"), zone("b", 300, "low-stock"), zone("c", 200)])).toEqual({
      a: "sold-out",
      b: "tier-1",
      c: "tier-2",
    });
  });

  it("devuelve un objeto vacío sin zonas", () => {
    expect(getZoneTones([])).toEqual({});
  });

  describeWithDb("con los tipos de entrada de la BD", () => {
    it("noche-de-sintetizadores-lima: VIP → tier-1, Preferencial → tier-2, Tribuna Norte → tier-3 y General → tier-4", async () => {
      expect(getZoneTones(await zonesOf("noche-de-sintetizadores-lima"))).toEqual({
        vip: "tier-1",
        preferencial: "tier-2",
        norte: "tier-3",
        general: "tier-4",
      });
    });

    it("festival-vive-latino-lima: un tono por precio, de Campo VIP (tier-1) a Tribuna Norte (tier-5)", async () => {
      expect(getZoneTones(await zonesOf("festival-vive-latino-lima"))).toEqual({
        "campo-vip": "tier-1",
        "campo-general": "tier-2",
        occidente: "tier-3",
        oriente: "tier-4",
        norte: "tier-5",
      });
    });

    it("risas-sin-filtro: Mesa vendida entera → sold-out", async () => {
      await inRolledBackTransaction(async () => {
        await sellTestSeats("risas-sin-filtro", { ticketTypes: ["mesa"] });
        expect(getZoneTones(await zonesOf("risas-sin-filtro"))).toMatchObject({ mesa: "sold-out" });
      });
    });
  });
});

describe("ZONE_TONE_CLASSES", () => {
  const tones: ZoneTone[] = ["tier-1", "tier-2", "tier-3", "tier-4", "tier-5", "sold-out"];

  it("define exactamente los 6 tonos", () => {
    expect(Object.keys(ZONE_TONE_CLASSES).sort()).toEqual([...tones].sort());
  });

  it.each(tones)("%s tiene forma (fill-), texto SVG + HTML (fill- y text-) y muestra (bg-)", (tone) => {
    const classes = ZONE_TONE_CLASSES[tone];
    expect(classes.shape).toMatch(/\bfill-/);
    expect(classes.label).toMatch(/\bfill-/);
    expect(classes.label).toMatch(/\btext-/);
    expect(classes.swatch).toMatch(/\bbg-/);
  });

  it("sigue la escala de azules Mentec de la decisión 28, del navy al azul muy claro", () => {
    expect(ZONE_TONE_CLASSES).toEqual({
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
    });
  });

  it("usa solo tokens del tema, sin colores arbitrarios ni de la paleta por defecto de Tailwind", () => {
    const all = Object.values(ZONE_TONE_CLASSES).flatMap((classes) => Object.values(classes)).join(" ");
    expect(all).not.toMatch(/#|\[|rgb|hsl|oklch/);
    expect(all).not.toMatch(
      /-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d|-(?:white|black)\b/,
    );
  });
});
