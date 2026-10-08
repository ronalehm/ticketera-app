import { describe, expect, it } from "vitest";

import { EVENTS_MOCK } from "../data/events.mock";
import { eventDetailSchema } from "../schemas/events.schema";
import { buildEventMetadata, getCoverAlt } from "./eventMetadata";

const event = eventDetailSchema.parse(EVENTS_MOCK[0]);
const ALT = "Noche de Sintetizadores: Gira Neón 2026 en Estadio Nacional, Lima";
const DESCRIPTION =
  "Estadio Nacional, Lima · sábado 14 de noviembre, 21:00 h. La Gira Neón 2026 llega a Lima con una noche dedicada al synth-pop y la electrónica en vivo. Tres horas de sintetizadores analógicos, visuales sincronizados y un escenario diseñado para esta gira.";

describe("getCoverAlt", () => {
  it("devuelve «<título> en <recinto>, <ciudad>»", () => {
    expect(getCoverAlt(event)).toBe(ALT);
  });
});

describe("buildEventMetadata", () => {
  const metadata = buildEventMetadata(event);

  it("título con el sufijo del sitio y descripción con recinto, fecha, hora de Lima y primer párrafo", () => {
    expect(metadata.title).toBe("Noche de Sintetizadores: Gira Neón 2026 | Mentec Tickets");
    expect(metadata.description).toBe(DESCRIPTION);
  });

  it("canonical relativa a /eventos/<slug> (la resuelve metadataBase)", () => {
    expect(metadata.alternates).toEqual({ canonical: "/eventos/noche-de-sintetizadores-lima" });
  });

  it("Open Graph con la portada y su alt", () => {
    expect(metadata.openGraph).toEqual({
      type: "website",
      siteName: "Mentec Tickets",
      locale: "es_PE",
      url: "/eventos/noche-de-sintetizadores-lima",
      title: event.title,
      description: DESCRIPTION,
      images: [{ url: event.imageUrl, alt: ALT }],
    });
  });

  it("X con tarjeta grande y los mismos valores que Open Graph", () => {
    expect(metadata.twitter).toEqual({
      card: "summary_large_image",
      title: event.title,
      description: DESCRIPTION,
      images: [{ url: event.imageUrl, alt: ALT }],
    });
  });

  it("no define robots (la página se indexa)", () => {
    expect(metadata).not.toHaveProperty("robots");
  });

  it("la hora sale en hora de Lima aunque el ISO venga en UTC", () => {
    // 02:00 UTC del 15 = 21:00 del sábado 14 en Lima.
    const { description } = buildEventMetadata({ ...event, startsAt: "2026-11-15T02:00:00Z" });
    expect(description).toBe(DESCRIPTION);
  });
});
