// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeWithDb } from "@/lib/db/testDb";
import type { Order } from "@/modules/checkout/orders";
import { getEventBySlug } from "@/modules/events";
import { formatSeatLabel, getVenueMapBySlug, type NumberedVenueZone } from "@/modules/seating";
import { splitOrdersByDate } from "../utils/myOrders";
import { DEMO_ACCOUNT_EMAIL, DEMO_ORDERS } from "./demoOrders";

const SEAT_ID = /^([a-z0-9]+(?:-[a-z0-9]+)*)-([A-Z]{1,2})-(\d{1,3})$/;
const NOW = new Date("2026-10-03T12:00:00-05:00");
const orders: Order[] = DEMO_ORDERS;
const { upcoming } = splitOrdersByDate(orders, NOW);

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** Cada entrada con su ítem y su asiento (entrada `-0n` ↔ n-ésima unidad de los ítems, en orden). */
function ticketSlots(order: Order) {
  return order.items.flatMap((item) =>
    Array.from({ length: item.quantity }, (_, index) => ({ item, seat: item.seats?.[index] })),
  );
}

describe("DEMO_ORDERS", () => {
  it("con now = 2026-10-03 hay al menos 2 próximas y 1 pasada", () => {
    const result = splitOrdersByDate(orders, NOW);
    expect(result.upcoming.length).toBeGreaterThanOrEqual(2);
    expect(result.past.length).toBeGreaterThanOrEqual(1);
  });

  describe.each(orders.map((order) => [order.code, order] as const))("%s", (_, order) => {
    it("tiene un code con formato MT-XXXXXX y es de la cuenta demo", () => {
      expect(order.code).toMatch(/^MT-[A-Z0-9]{6}$/);
      expect(order.ownerEmail).toBe(DEMO_ACCOUNT_EMAIL);
    });

    it("numera las entradas de forma correlativa desde -01", () => {
      expect(order.tickets.map((ticket) => ticket.code)).toEqual(
        order.tickets.map((_, index) => `${order.code}-${String(index + 1).padStart(2, "0")}`),
      );
    });

    it("cuadra entradas, ticketCount, cantidades y total", () => {
      expect(order.tickets).toHaveLength(order.ticketCount);
      expect(order.ticketCount).toBe(sum(order.items.map((item) => item.quantity)));
      expect(order.total).toBe(sum(order.items.map((item) => item.unitPrice * item.quantity)));
    });

    it("cada entrada lleva el nombre de su ítem y, si tiene asiento, su etiqueta en el mismo orden", () => {
      const slots = ticketSlots(order);
      expect(slots).toHaveLength(order.tickets.length);
      order.tickets.forEach((ticket, index) => {
        const { item, seat } = slots[index];
        expect(ticket.ticketTypeName).toBe(item.name);
        if (seat) expect(ticket.seatLabel).toBe(seat.label);
        else expect(ticket).not.toHaveProperty("seatLabel");
      });
    });

    it("en los ítems con asientos hay uno por unidad y sus id tienen formato <zona>-<FILA>-<n>", () => {
      for (const item of order.items) {
        if (!item.seats) continue;
        expect(item.seats).toHaveLength(item.quantity);
        for (const seat of item.seats) expect(seat.id).toMatch(SEAT_ID);
      }
    });

    describeWithDb("con el catálogo de la BD", () => {
      it("copia del catálogo los datos del evento y sus tipos de entrada", async () => {
        const event = await getEventBySlug(order.event.slug);
        expect(event).not.toBeNull();
        const { title, category, venue, city, imageUrl } = order.event;
        expect({ title, category, venue, city, imageUrl }).toEqual({
          title: event?.title,
          category: event?.category,
          venue: event?.venue,
          city: event?.city,
          imageUrl: event?.imageUrl,
        });
        if (upcoming.includes(order)) expect(Date.parse(order.event.startsAt)).toBe(Date.parse(event?.startsAt ?? ""));

        for (const item of order.items) {
          const ticketType = event?.ticketTypes.find((type) => type.id === item.ticketTypeId);
          expect(ticketType, item.ticketTypeId).toBeDefined();
          expect({ name: item.name, unitPrice: item.unitPrice }).toEqual({ name: ticketType?.name, unitPrice: ticketType?.price });
        }
      });

      it("si el evento tiene mapa, cada asiento existe en la zona del ítem con la etiqueta del mapa", async () => {
        const map = await getVenueMapBySlug(order.event.slug);
        if (!map) return;

        for (const item of order.items) {
          if (!item.seats) continue;
          const zone = map.zones.find(
            (candidate): candidate is NumberedVenueZone =>
              candidate.kind === "numbered" && candidate.ticketTypeId === item.ticketTypeId,
          );
          expect(zone, item.ticketTypeId).toBeDefined();

          for (const { id, label } of item.seats) {
            const seat = zone?.rows.flatMap((row) => row.seats).find((candidate) => candidate.id === id);
            expect(seat, id).toBeDefined();
            if (zone && seat) expect(label).toBe(formatSeatLabel(zone.name, seat.row, seat.number));
          }
        }
      });
    });
  });

  describeWithDb("con el catálogo de la BD", () => {
    it("el pedido pasado de La casa de los espejos usa Platea S/ 180 y los asientos platea-F-7 / platea-F-8", async () => {
      // Su evento tiene mapa, así que el test "si el evento tiene mapa…" sí valida sus asientos.
      expect(await getVenueMapBySlug("la-casa-de-los-espejos")).not.toBeNull();
      const order = orders.find((candidate) => candidate.code === "MT-9LM2TC");
      expect(order?.event.slug).toBe("la-casa-de-los-espejos");
      expect(order?.items).toEqual([
        expect.objectContaining({ ticketTypeId: "platea", name: "Platea", unitPrice: 180, quantity: 2 }),
      ]);
      expect(order?.items[0].seats?.map((seat) => seat.id)).toEqual(["platea-F-7", "platea-F-8"]);
    });
  });
});
