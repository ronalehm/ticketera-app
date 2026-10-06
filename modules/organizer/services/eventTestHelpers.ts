// Solo para los tests de integración de los servicios de eventos del panel (describeWithDb, con
// `vi.mock("@/lib/db/client", () => import("@/lib/db/testTransaction"))` en el archivo de test).
import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { expect } from "vitest";
import { organizers, users } from "@/lib/db/schema/identity";
import { orders } from "@/lib/db/schema/sales";
import { venueSeats, venueSections, venues } from "@/lib/db/schema/venues";
import type { Tx } from "@/lib/db/testTransaction";
import type { EventDraftInput, ManualVenueInput } from "../types/organizer.types";
import type { EventDraftError, EventDraftErrorCode } from "../utils/eventDraftError";
import { createEvent } from "./eventDrafts.service";

export type OrganizerStatus = "approved" | "pending" | "suspended";
export type Actor = { id: string; role: "organizer" | "admin" | "super_admin" | "customer" };

/** Usuario de prueba; con `status`, también su fila de `organizers` (aprobado con datos fiscales completos). */
export async function createUser(tx: Tx, status?: OrganizerStatus, overrides: Partial<typeof users.$inferInsert> = {}) {
  const suffix = randomUUID().slice(0, 8);
  const [{ id }] = await tx
    .insert(users)
    .values({
      email: `draft.${suffix}@example.com`,
      firstName: "Ana",
      lastName: `Prueba ${suffix}`,
      role: status ? "organizer" : "customer",
      ...overrides,
    })
    .returning({ id: users.id });
  if (status) {
    await tx.insert(organizers).values({
      userId: id,
      status,
      legalName: status === "approved" ? `Productora ${suffix} S.A.C.` : null,
      taxIdType: status === "approved" ? "ruc" : null,
      taxId: status === "approved" ? `test-${suffix}` : null,
      commissionBps: 1000,
    });
  }
  return { id, role: overrides.role ?? (status ? "organizer" : "customer") } as Actor;
}

/** Recinto con una sección general ("Campo", 300 lugares) y una numerada ("Platea", 2 × 3 asientos). */
export async function createVenue(tx: Tx, createdBy: string, status: "approved" | "pending_review" = "approved") {
  const suffix = randomUUID().slice(0, 8);
  const [{ id }] = await tx
    .insert(venues)
    .values({
      name: `Recinto ${suffix}`,
      address: "Av. Prueba 123",
      city: "Lima",
      status,
      organizerId: status === "approved" ? null : createdBy,
      createdBy,
    })
    .returning({ id: venues.id });
  const [platea] = await tx
    .insert(venueSections)
    .values({ venueId: id, slug: "platea", name: "Platea", sortOrder: 1, seating: "numbered" })
    .returning({ id: venueSections.id });
  const [campo] = await tx
    .insert(venueSections)
    .values({ venueId: id, slug: "campo", name: "Campo", sortOrder: 0, seating: "general", capacity: 300 })
    .returning({ id: venueSections.id });
  await tx.insert(venueSeats).values(
    ["A", "B"].flatMap((rowLabel, y) =>
      [1, 2, 3].map((number) => ({ sectionId: platea.id, rowLabel, number, x: number, y })),
    ),
  );
  return { id, name: `Recinto ${suffix}`, campoId: campo.id, plateaId: platea.id };
}

/** Borrador completo (cumple `events_draft_complete_check` aunque se pase a otro estado). */
export function draftInput(venue: { id: string; campoId: string; plateaId: string }, overrides: Partial<EventDraftInput> = {}) {
  return {
    title: "Festival de prueba",
    category: "festivales",
    description: "Tres escenarios.",
    startsAt: new Date("2027-01-16T01:00:00Z"),
    doorsOpenAt: new Date("2027-01-15T23:00:00Z"),
    minAge: 18,
    venue: { kind: "existing", id: venue.id },
    imageUrl: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
    organizerId: null,
    ticketTypes: [
      { sectionId: venue.campoId, name: "General", priceCents: 5000, sortOrder: 0 },
      { sectionId: venue.plateaId, name: "Platea VIP", priceCents: 12000, sortOrder: 1 },
    ],
    ...overrides,
  } satisfies EventDraftInput;
}

/** Recinto ingresado a mano con dos zonas generales (General 200, VIP 50) con ids nuevos, como los genera el formulario. */
export function manualVenueInput(overrides: Partial<ManualVenueInput> = {}): ManualVenueInput {
  return {
    kind: "manual",
    name: "Café La Esquina",
    address: "Av. Larco 1150, Miraflores",
    city: "Lima",
    sections: [
      { id: randomUUID(), name: "General", capacity: 200 },
      { id: randomUUID(), name: "VIP", capacity: 50 },
    ],
    ...overrides,
  };
}

/** Borrador completo con un recinto ingresado a mano y un tipo de entrada por zona. */
export function manualDraftInput(venue: ManualVenueInput = manualVenueInput(), overrides: Partial<EventDraftInput> = {}) {
  return draftInput(
    { id: "", campoId: "", plateaId: "" },
    {
      venue,
      ticketTypes: venue.sections.map((zone, sortOrder) => ({
        sectionId: zone.id,
        name: `Entrada ${zone.name}`,
        priceCents: 5000,
        sortOrder,
      })),
      ...overrides,
    },
  );
}

/** Recinto y sus zonas en orden, para comprobar lo que guardó el servicio. */
export async function getVenueWithZones(tx: Tx, venueId: string) {
  const [venue] = await tx
    .select({
      name: venues.name,
      address: venues.address,
      city: venues.city,
      status: venues.status,
      organizerId: venues.organizerId,
      createdBy: venues.createdBy,
    })
    .from(venues)
    .where(eq(venues.id, venueId));
  const zones = await tx
    .select({
      id: venueSections.id,
      slug: venueSections.slug,
      name: venueSections.name,
      sortOrder: venueSections.sortOrder,
      seating: venueSections.seating,
      capacity: venueSections.capacity,
    })
    .from(venueSections)
    .where(eq(venueSections.venueId, venueId))
    .orderBy(asc(venueSections.sortOrder));
  return { ...venue, zones };
}

/** Orden de prueba del evento (con comprador: `orders` lo exige fuera de `pending`). */
export async function insertOrder(
  tx: Tx,
  eventId: string,
  status: "pending" | "paid" | "partially_refunded" | "refunded",
  expiresAt: Date,
): Promise<void> {
  await tx.insert(orders).values({
    code: `TK-TEST-${randomUUID().slice(0, 8)}`,
    eventId,
    status,
    expiresAt,
    buyerName: "Comprador de prueba",
    buyerEmail: "comprador.prueba@example.com",
    buyerPhone: "+51900000000",
    buyerDocumentType: "dni",
    buyerDocumentNumber: "00000000",
    ticketCount: 1,
    subtotalCents: 0,
    platformFeeCents: 0,
    organizerAmountCents: 0,
  });
}

/** Organizador aprobado con un recinto aprobado y un borrador suyo. */
export async function setupDraft(tx: Tx, overrides: Partial<EventDraftInput> = {}) {
  const owner = await createUser(tx, "approved");
  const venue = await createVenue(tx, owner.id);
  const { id } = await createEvent(owner, draftInput(venue, overrides));
  return { owner, venue, eventId: id };
}

export const domainError = (code: EventDraftErrorCode) =>
  expect.objectContaining({ name: "EventDraftError", code }) as unknown as EventDraftError;
