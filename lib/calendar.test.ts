import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildIcsEvent, downloadIcs } from "./calendar";

const baseInput = {
  title: "Noche de sintetizadores",
  startsAt: "2026-11-14T21:00:00-05:00",
  location: "Teatro Municipal, Lima",
};

const octets = (value: string) => new TextEncoder().encode(value).length;

/** Lista de líneas lógicas (desplegadas) sin la línea vacía final. */
const unfold = (ics: string) => ics.replace(/\r\n /g, "").split("\r\n").slice(0, -1);

const getProperty = (ics: string, name: string) =>
  unfold(ics).find((line) => line.startsWith(`${name}:`));

describe("buildIcsEvent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-03T15:04:05.678Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("genera un VCALENDAR con un único VEVENT", () => {
    const lines = unfold(buildIcsEvent(baseInput));

    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines.at(-1)).toBe("END:VCALENDAR");
    expect(lines).toEqual(
      expect.arrayContaining([
        "VERSION:2.0",
        "PRODID:-//Mentec Tickets//ES",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
      ]),
    );
    expect(lines.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(1);
    expect(lines.filter((line) => line === "END:VEVENT")).toHaveLength(1);
    expect(lines.indexOf("BEGIN:VEVENT")).toBeLessThan(lines.indexOf("END:VEVENT"));
  });

  it("convierte DTSTART a UTC y no incluye DTEND", () => {
    const ics = buildIcsEvent(baseInput);

    expect(getProperty(ics, "DTSTART")).toBe("DTSTART:20261115T020000Z");
    expect(ics).not.toContain("DTEND");
  });

  it("usa la hora actual en UTC para DTSTAMP", () => {
    expect(getProperty(buildIcsEvent(baseInput), "DTSTAMP")).toBe("DTSTAMP:20261003T150405Z");
  });

  it("genera un UID estable para la misma entrada y distinto para otra", () => {
    const uid = getProperty(buildIcsEvent(baseInput), "UID");

    expect(uid).toMatch(/^UID:[0-9a-f]{8}@ticketera-mentec\.dev$/);

    vi.setSystemTime(new Date("2026-12-01T00:00:00Z"));
    expect(getProperty(buildIcsEvent({ ...baseInput, description: "Otra" }), "UID")).toBe(uid);
    expect(getProperty(buildIcsEvent({ ...baseInput, title: "Otro evento" }), "UID")).not.toBe(uid);
    expect(
      getProperty(buildIcsEvent({ ...baseInput, startsAt: "2026-11-15T21:00:00-05:00" }), "UID"),
    ).not.toBe(uid);
  });

  it("mantiene el UID fijado para la misma entrada", () => {
    expect(getProperty(buildIcsEvent(baseInput), "UID")).toBe("UID:b9c9de17@ticketera-mentec.dev");
  });

  it("escapa comas, punto y coma, barras invertidas y saltos de línea", () => {
    const ics = buildIcsEvent({
      title: "Rock; pop, y más",
      startsAt: baseInput.startsAt,
      location: "Sala A\\B, Lima",
      description: "Línea 1\nLínea 2\r\nLínea 3",
    });

    expect(getProperty(ics, "SUMMARY")).toBe("SUMMARY:Rock\\; pop\\, y más");
    expect(getProperty(ics, "LOCATION")).toBe("LOCATION:Sala A\\\\B\\, Lima");
    expect(getProperty(ics, "DESCRIPTION")).toBe("DESCRIPTION:Línea 1\\nLínea 2\\nLínea 3");
  });

  it("omite DESCRIPTION si no viene", () => {
    expect(buildIcsEvent(baseInput)).not.toContain("DESCRIPTION");
    expect(buildIcsEvent({ ...baseInput, description: "" })).not.toContain("DESCRIPTION");
  });

  it("separa todas las líneas con CRLF", () => {
    const ics = buildIcsEvent({ ...baseInput, description: "Pedido MT-AB12CD · 3 entradas" });

    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("pliega líneas largas con tildes en ≤ 75 octetos sin perder texto", () => {
    const description =
      "Pedido MT-AB12CD · 3 entradas · Mentec Tickets. Recuerda llevar tu DNI y llegar con " +
      "anticipación: las puertas se abren una hora antes. Información adicional en la página " +
      "del evento: música electrónica con sintetizadores analógicos y visuales en vivo. ¡Ñandú!";
    const ics = buildIcsEvent({ ...baseInput, description });
    const physicalLines = ics.split("\r\n").slice(0, -1);

    expect(physicalLines.some((line) => line.startsWith(" "))).toBe(true);
    for (const line of physicalLines) {
      expect(octets(line)).toBeLessThanOrEqual(75);
      expect(line).not.toContain("�");
    }
    expect(getProperty(ics, "DESCRIPTION")).toBe(`DESCRIPTION:${description}`);
  });

  it("no parte caracteres multibyte al plegar", () => {
    const description = "á".repeat(100);
    const ics = buildIcsEvent({ ...baseInput, description });
    const descriptionLines = ics
      .split("\r\n")
      .filter((line) => line.startsWith("DESCRIPTION:") || line.startsWith(" "));

    expect(descriptionLines.length).toBeGreaterThan(1);
    for (const line of descriptionLines) {
      expect(octets(line)).toBeLessThanOrEqual(75);
      expect(line.replace(/^DESCRIPTION:|^ /, "")).toMatch(/^á+$/);
    }
    expect(getProperty(ics, "DESCRIPTION")).toBe(`DESCRIPTION:${description}`);
  });
});

describe("downloadIcs", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("descarga el contenido como text/calendar con el nombre dado y revoca la URL", async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    // Evita la navegación de jsdom; el enlace se recupera del contexto de la llamada.
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadIcs("noche-de-sintetizadores-lima.ics", "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/calendar;charset=utf-8");
    expect(await blob.text()).toBe("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n");

    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe("noche-de-sintetizadores-lima.ics");
    expect(link.getAttribute("href")).toBe("blob:mock-url");
    expect(link.isConnected).toBe(false);

    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    expect(revokeObjectURL.mock.invocationCallOrder[0]).toBeGreaterThan(
      click.mock.invocationCallOrder[0],
    );
  });
});
