import { describe, expect, it } from "vitest";
import { formatPublishIssues, getPublishIssues, type PublishCandidate } from "./publishRequirements";

const NOW = new Date("2026-10-05T15:00:00Z");

const COMPLETE: PublishCandidate = {
  hasVenue: true,
  description: "Tres escenarios.",
  imageUrl: "https://example.com/portada.jpg",
  startsAt: new Date("2026-12-06T01:00:00Z"),
  doorsOpenAt: new Date("2026-12-05T23:00:00Z"),
  ticketTypeCount: 1,
};

describe("getPublishIssues", () => {
  it("un evento completo y futuro no tiene problemas", () => {
    expect(getPublishIssues(COMPLETE, NOW)).toEqual([]);
  });

  it("lista cada dato que falta (los del CHECK y al menos un tipo de entrada)", () => {
    const empty: PublishCandidate = {
      hasVenue: false,
      description: "   ",
      imageUrl: null,
      startsAt: null,
      doorsOpenAt: null,
      ticketTypeCount: 0,
    };
    expect(getPublishIssues(empty, NOW)).toEqual([
      "venue",
      "description",
      "image",
      "startsAt",
      "doorsOpenAt",
      "ticketTypes",
    ]);
  });

  it("una fecha de inicio pasada o igual a ahora no vale", () => {
    expect(getPublishIssues({ ...COMPLETE, startsAt: new Date("2026-10-01T00:00:00Z") }, NOW)).toEqual(["startsAtPast"]);
    expect(getPublishIssues({ ...COMPLETE, startsAt: NOW }, NOW)).toEqual(["startsAtPast"]);
  });

  it("un tipo de entrada sin lugares (sección numerada sin butacas) no vale", () => {
    expect(getPublishIssues({ ...COMPLETE, ticketTypeCount: 2, emptyTicketTypeCount: 1 }, NOW)).toEqual([
      "emptyTicketTypes",
    ]);
    expect(getPublishIssues({ ...COMPLETE, emptyTicketTypeCount: 0 }, NOW)).toEqual([]);
  });

  it("checkFutureDate: false no mira si la fecha ya pasó", () => {
    const started = { ...COMPLETE, startsAt: new Date("2026-10-01T00:00:00Z") };
    expect(getPublishIssues(started, NOW, { checkFutureDate: false })).toEqual([]);
  });
});

describe("formatPublishIssues", () => {
  it("dice qué falta, en una lista en español", () => {
    expect(formatPublishIssues(["venue", "image", "ticketTypes"])).toBe(
      "Faltan datos para publicar el evento: el recinto, la portada y al menos un tipo de entrada.",
    );
    expect(formatPublishIssues(["description"])).toBe("Faltan datos para publicar el evento: la descripción.");
  });

  it("avisa de los tipos de entrada sin lugares con su propia frase", () => {
    expect(formatPublishIssues(["image", "emptyTicketTypes", "startsAtPast"])).toBe(
      "Faltan datos para publicar el evento: la portada. Algún tipo de entrada es de una sección sin lugares: quítalo para publicar el evento. La fecha de inicio ya pasó: elige una fecha futura.",
    );
  });

  it("avisa de la fecha pasada, sola o con lo que falta", () => {
    expect(formatPublishIssues(["startsAtPast"])).toBe("La fecha de inicio ya pasó: elige una fecha futura.");
    expect(formatPublishIssues(["doorsOpenAt", "startsAtPast"])).toBe(
      "Faltan datos para publicar el evento: la apertura de puertas. La fecha de inicio ya pasó: elige una fecha futura.",
    );
  });
});
