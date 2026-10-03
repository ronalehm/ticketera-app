import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { downloadIcs } from "@/lib/calendar";
import { downloadTicketsPdf } from "@/lib/ticketPdf";
import { useOrdersStore } from "../stores/orders.store";
import type { Order } from "../types/checkout.types";
import { OrderConfirmation } from "./OrderConfirmation";

vi.mock("@/lib/calendar", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/calendar")>()),
  downloadIcs: vi.fn(),
}));

vi.mock("@/lib/ticketPdf", () => ({ downloadTicketsPdf: vi.fn().mockResolvedValue(undefined) }));

const CODE = "MT-AB12CD";

const ORDER: Order = {
  code: CODE,
  createdAt: "2026-10-03T15:00:00.000Z",
  ownerEmail: "luis@correo.pe",
  event: {
    slug: "noche-de-sintetizadores-lima",
    title: "Noche de Sintetizadores",
    category: "conciertos",
    startsAt: "2026-11-14T21:00:00-05:00",
    venue: "Estadio",
    city: "Lima",
    imageUrl: "/images/evento.jpg",
  },
  items: [
    {
      ticketTypeId: "general",
      name: "General",
      unitPrice: 250,
      quantity: 2,
      seats: [
        { id: "general-A-1", label: "General · Fila A, asiento 1" },
        { id: "general-A-2", label: "General · Fila A, asiento 2" },
      ],
    },
    {
      ticketTypeId: "vip",
      name: "VIP",
      unitPrice: 410,
      quantity: 1,
      seats: [{ id: "vip-B-5", label: "VIP · Fila B, asiento 5" }],
    },
  ],
  ticketCount: 3,
  total: 910,
  paymentMethod: "card",
  buyer: {
    firstName: "Luis",
    lastName: "Pérez",
    email: "luis@correo.pe",
    phone: "912345678",
    documentType: "dni",
    documentNumber: "12345678",
  },
  tickets: [
    { code: `${CODE}-01`, ticketTypeName: "General", seatLabel: "General · Fila A, asiento 1", holderName: "Luis Pérez" },
    { code: `${CODE}-02`, ticketTypeName: "General", seatLabel: "General · Fila A, asiento 2", holderName: "Luis Pérez" },
    { code: `${CODE}-03`, ticketTypeName: "VIP", seatLabel: "VIP · Fila B, asiento 5", holderName: "Luis Pérez" },
  ],
};

const STEPPER = <p>Stepper de prueba</p>;

function saveOrder(order: Order) {
  localStorage.setItem("mentec-orders", JSON.stringify({ state: { orders: [order] }, version: 0 }));
}

function renderConfirmation(code = CODE) {
  return render(<OrderConfirmation code={code} stepper={STEPPER} />);
}

const findConfirmed = () => screen.findByRole("heading", { level: 1, name: "¡Compra confirmada!" });

beforeEach(() => {
  useOrdersStore.setState({ orders: [] });
  localStorage.clear(); // setState también persiste
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(downloadIcs).mockReset();
  vi.mocked(downloadTicketsPdf).mockClear();
});

describe("OrderConfirmation", () => {
  it("muestra Cargando tu compra… antes de leer la orden", async () => {
    saveOrder(ORDER);
    renderConfirmation();

    expect(screen.getByRole("status").textContent).toContain("Cargando tu compra…");
    await findConfirmed();
    expect(screen.queryByText("Cargando tu compra…")).toBeNull();
  });

  it("con una orden guardada muestra la confirmación, la tarjeta-entrada, el stepper y Ver mis entradas", async () => {
    saveOrder(ORDER);
    renderConfirmation();

    await findConfirmed();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("Stepper de prueba")).toBeTruthy();
    expect(screen.getByText(/Pedido N\.º/).textContent).toBe(`Pedido N.º${CODE}`);

    const card = screen.getByRole("article", { name: "Noche de Sintetizadores" });
    expect(within(card).getByText("Conciertos")).toBeTruthy();
    expect(within(card).getByRole("heading", { name: "Noche de Sintetizadores" })).toBeTruthy();
    expect(within(card).getByText("Zona").nextElementSibling?.textContent).toBe("General, VIP");
    expect(within(card).getByText("Entradas").nextElementSibling?.textContent).toBe("3");
    expect(within(card).getByText("Total pagado").nextElementSibling?.textContent).toBe("S/ 910.00");
    expect(within(card).getByRole("img", { name: `Código QR de la entrada ${CODE}-01` })).toBeTruthy();
    expect(within(card).getByText("Entrada 1 de 3")).toBeTruthy();

    expect(screen.getByRole("link", { name: "Ver mis entradas" }).getAttribute("href")).toBe("/mis-entradas");
    expect(screen.getByRole("heading", { level: 2, name: "Qué sigue" }).className).toContain("sr-only");
  });

  it("muestra el correo del comprador en negrita en la cabecera", async () => {
    saveOrder(ORDER);
    renderConfirmation();
    await findConfirmed();

    const email = screen.getByText("luis@correo.pe");
    expect(email.tagName).toBe("STRONG");
    expect(email.className).toContain("break-all");
    expect(email.parentElement?.textContent).toBe(
      "Enviamos tus entradas a luis@correo.pe. También las tienes siempre en Mis entradas.",
    );
  });

  it("la tarjeta-entrada muestra la fecha sin año ni hora y los asientos compactos por zona, sin Asientos", async () => {
    saveOrder(ORDER);
    renderConfirmation();
    await findConfirmed();

    const card = screen.getByRole("article", { name: "Noche de Sintetizadores" });
    const date = within(card).getByText("sábado 14 de noviembre");
    expect(date.tagName).toBe("TIME");
    expect(date.getAttribute("datetime")).toBe(ORDER.event.startsAt);
    expect(date.parentElement?.textContent).toBe("sábado 14 de noviembre · Estadio, Lima");
    expect(within(card).getByText("General: Fila A · 1, 2")).toBeTruthy();
    expect(within(card).getByText("VIP: Fila B · 5")).toBeTruthy();
    expect(within(card).queryByText("Asientos")).toBeNull();
    expect(within(card).queryByText(/2026|21:00|9:00/)).toBeNull();
  });

  it("con una orden sin asientos la tarjeta-entrada no muestra líneas de asientos", async () => {
    saveOrder({
      ...ORDER,
      items: ORDER.items.map((item) => ({ ...item, seats: undefined })),
      tickets: ORDER.tickets.map((ticket) => ({ ...ticket, seatLabel: undefined })),
    });
    renderConfirmation();
    await findConfirmed();

    const card = screen.getByRole("article", { name: "Noche de Sintetizadores" });
    expect(within(card).queryByText(/Fila/)).toBeNull();
    expect(within(card).queryByText(/^(General|VIP):/)).toBeNull();
    expect(within(card).getByText("Zona").nextElementSibling?.textContent).toBe("General, VIP");
  });

  it("Agregar al calendario descarga <slug>.ics con el título del evento", async () => {
    saveOrder(ORDER);
    renderConfirmation();
    await findConfirmed();

    fireEvent.click(screen.getByRole("button", { name: "Agregar al calendario" }));

    expect(downloadIcs).toHaveBeenCalledTimes(1);
    const [fileName, content] = vi.mocked(downloadIcs).mock.calls[0];
    expect(fileName).toBe("noche-de-sintetizadores-lima.ics");
    expect(content).toContain("SUMMARY:Noche de Sintetizadores");
    expect(content).toContain("LOCATION:Estadio\\, Lima");
    expect(content).toContain(`DESCRIPTION:Pedido ${CODE} · 3 entradas · Mentec Tickets`);
  });

  it("Descargar PDF descarga el PDF del pedido sin abrir el diálogo de impresión", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    saveOrder(ORDER);
    renderConfirmation();
    await findConfirmed();

    fireEvent.click(screen.getByRole("button", { name: "Descargar PDF" }));

    expect(downloadTicketsPdf).toHaveBeenCalledTimes(1);
    const [input] = vi.mocked(downloadTicketsPdf).mock.calls[0];
    expect(input.orderCode).toBe(CODE);
    expect(input.tickets.map(({ code, locationLabel }) => ({ code, locationLabel }))).toEqual(
      ORDER.tickets.map(({ code, seatLabel }) => ({ code, locationLabel: seatLabel })),
    );
    expect(print).not.toHaveBeenCalled();
    // Deja que el botón vuelva a reposo dentro del test.
    expect(await screen.findByRole("button", { name: "Descargar PDF" })).toBeTruthy();
  });

  it("no renderiza la región solo-impresión Tus entradas", async () => {
    saveOrder(ORDER);
    renderConfirmation();
    await findConfirmed();

    expect(screen.queryByRole("region", { name: "Tus entradas" })).toBeNull();
    expect(screen.queryByText("Tus entradas")).toBeNull();
  });

  it("con un código que no está en el navegador muestra No encontramos tu compra sin stepper", async () => {
    saveOrder(ORDER);
    renderConfirmation("MT-ZZZZZZ");

    expect(await screen.findByRole("heading", { level: 1, name: "No encontramos tu compra" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Volver al inicio" }).getAttribute("href")).toBe("/");
    expect(screen.queryByText("Stepper de prueba")).toBeNull();
    expect(screen.queryByRole("article")).toBeNull();
  });
});
