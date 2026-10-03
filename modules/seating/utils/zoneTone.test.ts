import { describe, expect, it } from "vitest";
import { getEventBySlug } from "@/modules/events";
import type { VenueZone, ZoneTone } from "../types/seating.types";
import { getZoneTones, ZONE_TONE_CLASSES } from "./zoneTone";

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

  it("con más de 4 precios distintos, del 4.º en adelante usa tier-4", () => {
    expect(
      getZoneTones([zone("a", 500), zone("b", 400), zone("c", 300), zone("d", 200), zone("e", 100), zone("f", 50)]),
    ).toEqual({
      a: "tier-1",
      b: "tier-2",
      c: "tier-3",
      d: "tier-4",
      e: "tier-4",
      f: "tier-4",
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

  it("noche-de-sintetizadores-lima: VIP → tier-1, Preferencial → tier-2, Tribuna Norte → tier-3 y General → tier-4", async () => {
    expect(getZoneTones(await zonesOf("noche-de-sintetizadores-lima"))).toEqual({
      vip: "tier-1",
      preferencial: "tier-2",
      norte: "tier-3",
      general: "tier-4",
    });
  });

  it("risas-sin-filtro: Mesa → sold-out", async () => {
    expect(getZoneTones(await zonesOf("risas-sin-filtro"))).toMatchObject({ mesa: "sold-out" });
  });
});

describe("ZONE_TONE_CLASSES", () => {
  const tones: ZoneTone[] = ["tier-1", "tier-2", "tier-3", "tier-4", "sold-out"];

  it.each(tones)("%s tiene clases de forma, texto y muestra", (tone) => {
    const classes = ZONE_TONE_CLASSES[tone];
    expect(classes.shape).toMatch(/\bfill-/);
    expect(classes.label).toMatch(/\bfill-/);
    expect(classes.swatch).toMatch(/\bbg-/);
  });

  it("usa solo tokens del tema, sin colores arbitrarios", () => {
    const all = Object.values(ZONE_TONE_CLASSES).flatMap((classes) => Object.values(classes)).join(" ");
    expect(all).not.toMatch(/#|\[|rgb|hsl/);
  });
});
