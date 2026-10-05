// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { events } from "@/lib/db/schema/events";
import { orders } from "@/lib/db/schema/sales";
import { describeWithDb } from "@/lib/db/testDb";
import { createTestEvent, type TestEvent } from "@/lib/db/testFixtures";
import type { CheckoutOrder, CheckoutOrderItem } from "../types/checkout.types";
import { getPendingCheckout } from "./orders.service";
import { reserveCheckoutOrder } from "./reservation.service";

const STARTS_AT = new Date("2026-12-12T01:00:00.000Z");
const IMAGE_URL = "https://example.com/evento.jpg";

let testEvent: TestEvent;

async function reserve(items: CheckoutOrderItem[]): Promise<string> {
  const order = { event: { slug: testEvent.slug }, items, quantities: {}, ticketCount: 0, total: 0 } as unknown as CheckoutOrder;
  const result = await reserveCheckoutOrder(order, null);
  if (result.status !== "reserved") throw new Error(`Reserva fallida: ${result.status}`);
  return result.orderId;
}

describeWithDb("orders.service", () => {
  beforeAll(async () => {
    testEvent = await createTestEvent({ general: 3, numbered: { rows: ["A", "B"], seatsPerRow: 2 }, priceCents: 5000 });
    // Los eventos `draft` de prueba no traen fecha ni imagen; un evento publicado siempre las tiene.
    await db.update(events).set({ startsAt: STARTS_AT, imageUrl: IMAGE_URL }).where(eq(events.id, testEvent.eventId));
  });

  afterAll(async () => {
    await testEvent?.cleanup();
  });

  it.each([
    ["no UUID", "abc"],
    ["repetido", [randomUUID(), randomUUID()]],
    ["ausente", undefined],
    ["UUID inexistente", randomUUID()],
  ])("%s → not-found", async (_, orderId) => {
    expect(await getPendingCheckout(orderId)).toEqual({ status: "not-found" });
  });

  it("orden vencida → expired con eventSlug", async () => {
    const orderId = await reserve([{ ticketTypeId: "general", name: "General", unitPrice: 50, quantity: 1 }]);
    await db.update(orders).set({ expiresAt: sql`now() - interval '1 second'` }).where(eq(orders.id, orderId));

    expect(await getPendingCheckout(orderId)).toEqual({ status: "expired", eventSlug: testEvent.slug });
  });

  it("orden vigente → ok con líneas en el orden de sort_order, asientos, total, amountCents y remainingMs", async () => {
    const orderId = await reserve([
      { ticketTypeId: "general", name: "General", unitPrice: 50, quantity: 2 },
      {
        ticketTypeId: "numbered",
        name: "Platea",
        unitPrice: 50,
        quantity: 2,
        seats: [
          { id: "numbered-B-2", label: "" },
          { id: "numbered-A-1", label: "" },
        ],
      },
    ]);

    const result = await getPendingCheckout(orderId);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.orderId).toBe(orderId);
    expect(result.amountCents).toBe(20000);
    expect(result.remainingMs).toBeGreaterThan(0);
    expect(result.remainingMs).toBeLessThanOrEqual(600_000);
    expect(result.order).toEqual({
      event: {
        slug: testEvent.slug,
        title: expect.stringMatching(/^Evento de prueba /),
        category: expect.any(String),
        startsAt: STARTS_AT.toISOString(),
        venue: expect.stringMatching(/^Recinto /),
        city: "Lima",
        imageUrl: IMAGE_URL,
      },
      items: [
        { ticketTypeId: "general", name: "General", unitPrice: 50, quantity: 2 },
        {
          ticketTypeId: "numbered",
          name: "Platea",
          unitPrice: 50,
          quantity: 2,
          seats: [
            { id: "numbered-A-1", label: "Platea · Fila A · Asiento 1" },
            { id: "numbered-B-2", label: "Platea · Fila B · Asiento 2" },
          ],
        },
      ],
      quantities: { general: 2, numbered: 2 },
      ticketCount: 4,
      total: 200,
    });
  });
});
