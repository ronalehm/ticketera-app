import { describe, expect, it } from "vitest";
import { eventDetailSchema, eventSchema } from "../schemas/events.schema";
import { type EventDetailRecord, type TicketTypeRecord, toEvent, toEventDetail } from "./eventRecords";

const record: EventDetailRecord = {
  id: "8f1c2a4e-0000-8000-8000-000000000001",
  slug: "noche-de-sintetizadores-lima",
  title: "Noche de Sintetizadores",
  category: "conciertos",
  startsAt: new Date("2026-11-15T02:00:00Z"),
  venue: "Estadio Nacional",
  city: "Lima",
  imageUrl: "https://example.com/event.jpg",
  featured: true,
  priceFromCents: 18000,
  totalSeats: 100,
  availableSeats: 50,
  description: "Primer párrafo.\n\nSegundo párrafo.",
  address: "Av. José Díaz s/n",
  doorsOpenAt: new Date("2026-11-15T00:30:00Z"),
  minAge: 18,
  organizer: "Pulso Producciones",
};

const ticketTypes: TicketTypeRecord[] = [
  { slug: "general", name: "General", description: null, priceCents: 18000, totalSeats: 10, availableSeats: 10 },
  { slug: "vip", name: "VIP", description: "Zona frente al escenario", priceCents: 45050, totalSeats: 10, availableSeats: 2 },
  { slug: "tribuna-norte", name: "Tribuna Norte", description: null, priceCents: 9000, totalSeats: 10, availableSeats: 0 },
];

describe("toEvent", () => {
  it("convierte céntimos a soles y fechas a ISO válido", () => {
    const event = toEvent(record);
    expect(event.priceFrom).toBe(180);
    expect(event.startsAt).toBe("2026-11-15T02:00:00.000Z");
    expect(eventSchema.shape.startsAt.safeParse(event.startsAt).success).toBe(true);
  });

  it("calcula el status desde los conteos", () => {
    expect(toEvent(record).status).toBe("available");
    expect(toEvent({ ...record, availableSeats: 20 }).status).toBe("low-stock");
    expect(toEvent({ ...record, availableSeats: 0 }).status).toBe("sold-out");
  });

  it("una categoría desconocida hace fallar eventSchema.parse", () => {
    expect(() => eventSchema.parse(toEvent({ ...record, category: "opera" }))).toThrow();
  });

  it.each(["startsAt", "imageUrl"] as const)("lanza con el slug si %s es null", (field) => {
    expect(() => toEvent({ ...record, [field]: null })).toThrow(`Evento publicado incompleto: ${record.slug}`);
  });
});

describe("toEventDetail", () => {
  const detail = toEventDetail(record, ticketTypes);

  it("pasa eventDetailSchema", () => {
    expect(eventDetailSchema.safeParse(detail).success).toBe(true);
  });

  it("respeta el orden de ticketTypes y mapea slug, precio y status", () => {
    expect(detail.ticketTypes).toEqual([
      { id: "general", name: "General", price: 180, status: "available" },
      { id: "vip", name: "VIP", description: "Zona frente al escenario", price: 450.5, status: "low-stock" },
      { id: "tribuna-norte", name: "Tribuna Norte", price: 90, status: "sold-out" },
    ]);
  });

  it("omite description null", () => {
    expect(detail.ticketTypes[0]).not.toHaveProperty("description");
  });

  it("incluye los campos del detalle", () => {
    expect(detail).toMatchObject({
      doorsOpenAt: "2026-11-15T00:30:00.000Z",
      minAge: 18,
      organizer: "Pulso Producciones",
      address: "Av. José Díaz s/n",
    });
  });

  it.each(["description", "doorsOpenAt"] as const)("lanza con el slug si %s es null", (field) => {
    expect(() => toEventDetail({ ...record, [field]: null }, ticketTypes)).toThrow(
      `Evento publicado incompleto: ${record.slug}`,
    );
  });
});
