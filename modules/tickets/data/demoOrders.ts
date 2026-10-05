import type { Order } from "@/modules/checkout/orders";

// Datos de demostración para la cuenta de prueba, no compras reales. Los datos del evento se copian del
// catálogo (`EVENTS_MOCK` es interno de `events`); `demoOrders.test.ts` los contrasta con `getEventBySlug`.
export const DEMO_ACCOUNT_EMAIL = "demo@mentectickets.pe";

const image = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

const DEMO_BUYER = { name: "Ana Quispe", email: DEMO_ACCOUNT_EMAIL } as const satisfies Order["buyer"];

export const DEMO_ORDERS = [
  {
    code: "MT-7Q4K2P",
    createdAt: "2026-09-20T18:42:00-05:00",
    ownerEmail: DEMO_ACCOUNT_EMAIL,
    event: {
      slug: "noche-de-sintetizadores-lima",
      title: "Noche de Sintetizadores: Gira Neón 2026",
      category: "conciertos",
      startsAt: "2026-11-14T21:00:00-05:00",
      venue: "Estadio Nacional",
      city: "Lima",
      imageUrl: image("1501386761578-eac5c94b800a"),
    },
    items: [{ ticketTypeId: "general", name: "General", unitPrice: 180, quantity: 2 }],
    ticketCount: 2,
    total: 360,
    paymentMethod: "card",
    buyer: DEMO_BUYER,
    tickets: [
      { code: "MT-7Q4K2P-01", ticketTypeName: "General", holderName: "Ana Quispe" },
      { code: "MT-7Q4K2P-02", ticketTypeName: "General", holderName: "Carlos Quispe" },
    ],
  },
  {
    code: "MT-3HX9RB",
    createdAt: "2026-09-28T10:15:00-05:00",
    ownerEmail: DEMO_ACCOUNT_EMAIL,
    event: {
      slug: "clasico-del-pacifico",
      title: "Clásico del Pacífico: final de temporada",
      category: "deportes",
      startsAt: "2026-11-29T15:30:00-05:00",
      venue: "Estadio Nacional",
      city: "Lima",
      imageUrl: image("1574629810360-7efbbe195018"),
    },
    items: [
      {
        ticketTypeId: "occidente",
        name: "Occidente",
        unitPrice: 220,
        quantity: 1,
        seats: [{ id: "occidente-F-12", label: "Tribuna Occidente · Fila F · Asiento 12" }],
      },
    ],
    ticketCount: 1,
    total: 220,
    paymentMethod: "yape",
    buyer: DEMO_BUYER,
    tickets: [
      {
        code: "MT-3HX9RB-01",
        ticketTypeName: "Occidente",
        seatLabel: "Tribuna Occidente · Fila F · Asiento 12",
        holderName: "Ana Quispe",
      },
    ],
  },
  {
    code: "MT-9LM2TC",
    createdAt: "2026-07-30T20:05:00-05:00",
    ownerEmail: DEMO_ACCOUNT_EMAIL,
    event: {
      slug: "la-casa-de-los-espejos",
      title: "La casa de los espejos",
      category: "teatro",
      // Función anterior (fija), distinta de la fecha actual del catálogo.
      startsAt: "2026-08-15T19:30:00-05:00",
      venue: "Gran Teatro Nacional",
      city: "Lima",
      imageUrl: image("1503095396549-807759245b35"),
    },
    items: [
      {
        ticketTypeId: "platea",
        name: "Platea",
        unitPrice: 180,
        quantity: 2,
        seats: [
          { id: "platea-F-7", label: "Platea · Fila F · Asiento 7" },
          { id: "platea-F-8", label: "Platea · Fila F · Asiento 8" },
        ],
      },
    ],
    ticketCount: 2,
    total: 360,
    paymentMethod: "pagoefectivo",
    buyer: DEMO_BUYER,
    tickets: [
      { code: "MT-9LM2TC-01", ticketTypeName: "Platea", seatLabel: "Platea · Fila F · Asiento 7", holderName: "Ana Quispe" },
      { code: "MT-9LM2TC-02", ticketTypeName: "Platea", seatLabel: "Platea · Fila F · Asiento 8", holderName: "Lucía Mendoza" },
    ],
  },
] satisfies Order[];
