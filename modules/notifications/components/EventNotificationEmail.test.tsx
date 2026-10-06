// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatChangeValue, renderEventNotificationEmail } from "./EventNotificationEmail";

const BASE = {
  title: "Festival de verano",
  eventUrl: "https://tickets.example.com/eventos/festival-de-verano",
  ticketsUrl: "https://tickets.example.com/mis-entradas",
  from: "Mentec Tickets <notificaciones@ticketera.mentec.dev>",
};

describe("renderEventNotificationEmail", () => {
  it("cambio de fecha: asunto, antes → ahora en hora de Lima, enlaces y pie con el remitente", async () => {
    const email = await renderEventNotificationEmail({
      ...BASE,
      kind: "schedule",
      changes: [{ field: "startsAt", before: "2026-11-15T01:00:00.000Z", after: "2026-11-16T03:30:00.000Z" }],
    });
    expect(email.subject).toBe("Nueva fecha para Festival de verano");
    expect(email.text).toContain("Fecha y hora: sábado, 14 de noviembre de 2026, 20:00 → domingo, 15 de noviembre de 2026, 22:30");
    expect(email.text).toContain(BASE.eventUrl);
    expect(email.text).toContain(BASE.ticketsUrl);
    expect(email.text).toContain("Te escribe Mentec Tickets porque compraste entradas para Festival de verano.");
    expect(email.html).toContain(`href="${BASE.eventUrl}"`);
    expect(email.html).toContain("Mis entradas");
  });

  it("cancelación: asunto propio y sin lista de cambios", async () => {
    const email = await renderEventNotificationEmail({
      ...BASE,
      kind: "cancelled",
      changes: [{ field: "status", before: "published", after: "cancelled" }],
    });
    expect(email.subject).toBe("Festival de verano fue cancelado");
    expect(email.text).toContain("fue cancelado");
    expect(email.text).not.toContain("published");
  });

  it("cambios agrupados: un renglón por campo, con etiqueta o el nombre del campo si no tiene", async () => {
    const email = await renderEventNotificationEmail({
      ...BASE,
      kind: "update",
      changes: [
        { field: "title", before: "Festival", after: "Festival de verano" },
        { field: "description", before: null, after: "Tres escenarios" },
        { field: "Entrada VIP", before: "VIP", after: "VIP Gold" },
      ],
    });
    expect(email.subject).toBe("Cambios en tu evento: Festival de verano");
    expect(email.text).toContain("Nombre del evento: Festival → Festival de verano");
    expect(email.text).toContain("Descripción: — → Tres escenarios");
    expect(email.text).toContain("Entrada VIP: VIP → VIP Gold");
  });
});

describe("formatChangeValue", () => {
  it.each([
    [null, "—"],
    ["", "—"],
    [true, "Sí"],
    [false, "No"],
    [18, "18"],
    ["2026-11-15T01:00:00.000Z", "sábado, 14 de noviembre de 2026, 20:00"],
  ])("%s → %s", (value, expected) => {
    expect(formatChangeValue(value)).toBe(expected);
  });
});
