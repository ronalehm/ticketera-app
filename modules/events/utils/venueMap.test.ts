import { describe, expect, it } from "vitest";
import { buildDirectionsUrl, buildMapEmbedUrl, buildVenueQuery, type VenueLocation } from "./venueMap";

const granTeatro: VenueLocation = {
  venue: "Gran Teatro Nacional",
  address: "Av. Javier Prado Este 2225, San Borja, Lima",
  city: "Lima",
};

const GRAN_TEATRO_QUERY = "Gran Teatro Nacional, Av. Javier Prado Este 2225, San Borja, Lima, Lima, Perú";

describe("buildVenueQuery", () => {
  it("une lugar, dirección, ciudad y país", () => {
    expect(buildVenueQuery(granTeatro)).toBe(GRAN_TEATRO_QUERY);
  });
});

describe("buildDirectionsUrl", () => {
  it("apunta a la acción de direcciones con destination igual a la búsqueda", () => {
    const url = new URL(buildDirectionsUrl(granTeatro));
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("destination")).toBe(buildVenueQuery(granTeatro));
  });

  it("no incluye key, origin ni travelmode", () => {
    const url = new URL(buildDirectionsUrl(granTeatro));
    expect(url.searchParams.has("key")).toBe(false);
    expect(url.searchParams.has("origin")).toBe(false);
    expect(url.searchParams.has("travelmode")).toBe(false);
  });

  it("codifica caracteres especiales sin crear parámetros extra", () => {
    const location: VenueLocation = { venue: "Peña Ñaña", address: "Jr. Ñaña & Cía #2? Peña", city: "Lima" };
    const url = new URL(buildDirectionsUrl(location));
    expect(url.searchParams.get("destination")).toBe("Peña Ñaña, Jr. Ñaña & Cía #2? Peña, Lima, Perú");
    expect([...url.searchParams.keys()]).toEqual(["api", "destination"]);
    expect(url.hash).toBe("");
  });

  it("empieza por la URL universal de direcciones", () => {
    expect(buildDirectionsUrl(granTeatro).startsWith("https://www.google.com/maps/dir/?api=1&destination=")).toBe(true);
  });
});

describe("buildMapEmbedUrl", () => {
  it("con clave devuelve la URL de la Maps Embed API en modo place", () => {
    const embedUrl = buildMapEmbedUrl(granTeatro, "test-key");
    expect(embedUrl).not.toBeNull();
    const url = new URL(embedUrl as string);
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/embed/v1/place");
    expect(url.searchParams.get("key")).toBe("test-key");
    expect(url.searchParams.get("q")).toBe(buildVenueQuery(granTeatro));
    expect(url.searchParams.get("language")).toBe("es");
    expect(url.searchParams.get("region")).toBe("PE");
  });

  it("sin clave devuelve null", () => {
    expect(buildMapEmbedUrl(granTeatro, undefined)).toBeNull();
  });

  it("con clave vacía devuelve null", () => {
    expect(buildMapEmbedUrl(granTeatro, "")).toBeNull();
  });
});
