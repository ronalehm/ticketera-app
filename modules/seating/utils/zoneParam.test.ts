import { describe, expect, it } from "vitest";
import type { VenueZone } from "../types/seating.types";
import { buildZoneEntryHref, parseInitialZoneId } from "./zoneParam";

const SLUG = "noche-de-sintetizadores-lima";

/** Una zona de pie, una numerada y una agotada. */
const zones: Pick<VenueZone, "id" | "status">[] = [
  { id: "vip", status: "available" },
  { id: "norte", status: "low-stock" },
  { id: "mesa", status: "sold-out" },
];

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("buildZoneEntryHref", () => {
  it("lleva a la pantalla de entradas con la zona en `zona`", () => {
    expect(buildZoneEntryHref(SLUG, "vip")).toBe("/eventos/noche-de-sintetizadores-lima/entradas?zona=vip");
  });
});

describe("parseInitialZoneId", () => {
  it.each(["vip", "norte"])("devuelve el id de una zona comprable (%s)", (zoneId) => {
    expect(parseInitialZoneId(zones, params(`zona=${zoneId}`))).toBe(zoneId);
  });

  it.each([
    ["sin zona", ""],
    ["zona agotada", "zona=mesa"],
    ["zona inexistente", "zona=xx"],
    ["en mayúsculas", "zona=VIP"],
    ["vacía", "zona="],
    ["con espacios", "zona=%20vip%20"],
    ["repetida con el mismo valor", "zona=vip&zona=vip"],
    ["repetida con valores distintos", "zona=vip&zona=norte"],
  ])("devuelve null %s", (_case, query) => {
    expect(parseInitialZoneId(zones, params(query))).toBeNull();
  });

  it("ignora el resto de parámetros", () => {
    expect(parseInitialZoneId(zones, params("zona=vip&vip=2&asientos=norte-A-1%2Cnorte-A-2"))).toBe("vip");
  });

  it("ida y vuelta: cada zona comprable se lee del enlace que la construye", () => {
    for (const zone of zones.filter((candidate) => candidate.status !== "sold-out")) {
      const { searchParams } = new URL(buildZoneEntryHref(SLUG, zone.id), "http://localhost");
      expect(parseInitialZoneId(zones, searchParams)).toBe(zone.id);
    }
  });
});
