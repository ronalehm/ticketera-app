import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { downloadIcs } from "@/lib/calendar";
import { downloadTicketsPdf } from "@/lib/ticketPdf";
import type { Order } from "../types/checkout.types";
import { OrderConfirmation } from "./OrderConfirmation";

vi.mock("@/lib/calendar", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/calendar")>()),
  downloadIcs: vi.fn(),
}));

vi.mock("@/lib/ticketPdf", () => ({ downloadTicketsPdf: vi.fn().mockResolvedValue(undefined) }));

const CODE = "TK-1001";

const ORDER: Order = {
  code: CODE,
  createdAt: "2026-10-03T15:00:00.000Z",
  event: {
    slug: "noche-de-sintetizadores-lima",
    title: "Noche de Sintetizadores",
    category: "conciertos",
    categoryName: "Música en vivo",
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
  buyer: { name: "Luis Pérez", email: "luis@correo.pe" },
  tickets: [
    { code: `${CODE}-01`, qrToken: "qTok01Zk9x_Lr8Tn2Yb-Pw4", ticketTypeName: "General", seatLabel: "General · Fila A, asiento 1", holderName: "Luis Pérez" },
    { code: `${CODE}-02`, qrToken: "qTok02Zk9x_Lr8Tn2Yb-Pw4", ticketTypeName: "General", seatLabel: "General · Fila A, asiento 2", holderName: "Luis Pérez" },
    { code: `${CODE}-03`, qrToken: "qTok03Zk9x_Lr8Tn2Yb-Pw4", ticketTypeName: "VIP", seatLabel: "VIP · Fila B, asiento 5", holderName: "Luis Pérez" },
  ],
};

function renderConfirmation(order: Order = ORDER) {
  return render(<OrderConfirmation order={order} />);
}

const getSteps = () => screen.queryByRole("list", { name: "Pasos de la compra" });

/** Elemento cuyo texto completo (incluidos los `span` por ancho) es `text`. */
const byFullText = (tagName: string, text: string) => (_: string, element: Element | null) =>
  element?.tagName === tagName && element.textContent === text;


afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(downloadIcs).mockReset();
  vi.mocked(downloadTicketsPdf).mockClear();
});

describe("OrderConfirmation", () => {
  it("con la orden muestra el h1, la confirmación, la tarjeta-entrada, el stepper y Ver mis entradas", () => {
    renderConfirmation();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("¡Compra confirmada!");
    expect(screen.getAllByRole("banner")).toHaveLength(1);
    expect(screen.getAllByRole("main")).toHaveLength(1);

    const steps = getSteps();
    expect(steps).not.toBeNull();
    const current = within(steps!).getAllByRole("listitem").find((item) => item.getAttribute("aria-current"));
    expect(current?.getAttribute("aria-current")).toBe("step");
    expect(current?.textContent).toContain("Confirmación");
    expect(screen.queryByText("Compra segura")).toBeNull();

    const orderChip = screen.getByText(/Pedido N\.º/);
    expect(orderChip.textContent).toBe(`Pedido N.º${CODE}`);
    expect(orderChip.className).toContain("bg-card");

    const card = screen.getByRole("article", { name: "Noche de Sintetizadores" });
    expect(within(card).getByText("Música en vivo")).toBeTruthy();
    expect(within(card).getByRole("heading", { name: "Noche de Sintetizadores" })).toBeTruthy();
    expect(within(card).getByText("Zona").nextElementSibling?.textContent).toBe("General, VIP");
    expect(within(card).getByText("Entradas").nextElementSibling?.textContent).toBe("3");
    const total = within(card).getByText(byFullText("DT", "Total pagado"));
    expect(total.nextElementSibling?.textContent).toBe("S/ 910.00");
    expect(within(total).getByText("pagado").className).toContain("max-md:hidden");
    expect(within(card).getByRole("img", { name: `Código QR de la entrada ${CODE}-01` })).toBeTruthy();
    expect(within(card).getByText("Entrada 1 de 3")).toBeTruthy();

    expect(screen.getByRole("link", { name: "Ver mis entradas" }).getAttribute("href")).toBe("/mis-entradas");
  });

  it("Qué sigue tiene el h2 visible solo por debajo de md, Descarga tus entradas en vez de Revisa tu correo y el texto corto y el largo por ancho", () => {
    renderConfirmation();

    const heading = screen.getByRole("heading", { level: 2, name: "Qué sigue" });
    expect(heading.classList.contains("md:sr-only")).toBe(true);
    expect(heading.classList.contains("sr-only")).toBe(false);

    const section = screen.getByRole("region", { name: "Qué sigue" });
    const steps = within(section).getAllByRole("listitem");
    const texts = [
      [
        "Cada entrada tiene su QR. Muéstralo en el ingreso.",
        "Cada entrada tiene su propio QR. Muéstralo desde tu celular en el ingreso.",
      ],
      [
        "Ingresa con tu cuenta para verlas cuando quieras.",
        "Entra con tu cuenta para ver y descargar tus entradas cuando quieras.",
      ],
    ];
    expect(steps).toHaveLength(3);
    expect(steps[0].textContent).toBe("Descarga tus entradasGuárdalas en PDF o muéstralas desde Mis entradas.");
    expect(within(section).queryByText(/Revisa tu correo/)).toBeNull();
    steps.slice(1).forEach((step, index) => {
      const [shortText, longText] = texts[index];
      expect(within(step).getByText(shortText).className).toBe("md:hidden");
      expect(within(step).getByText(longText).className).toBe("max-md:hidden");
    });
  });

  it("portada de otro dominio: la img de la tarjeta-entrada usa la URL tal cual, sin pasar por /_next/image", () => {
    const cover = "https://cdn.example.org/x.jpg";
    const { container } = renderConfirmation({ ...ORDER, event: { ...ORDER.event, imageUrl: cover } });
    const img = container.querySelector(`img[src="${cover}"]`) as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute("srcset")).toBeNull();
    expect(container.querySelector('img[src^="/_next/image"]')).toBeNull();
  });

  it("muestra el correo del comprador en negrita en la cabecera", () => {
    renderConfirmation();

    const email = screen.getByText("luis@correo.pe");
    expect(email.tagName).toBe("STRONG");
    expect(email.className).toContain("break-all");
    expect(email.parentElement?.textContent).toBe(
      "Tus entradas están listas. Te las mostramos abajo y también las tienes en Mis entradas con tu cuenta de luis@correo.pe.",
    );
  });

  it("la tarjeta-entrada muestra la fecha sin año ni hora y los asientos compactos por zona, sin Asientos", () => {
    renderConfirmation();

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

  it("con una orden sin asientos la tarjeta-entrada no muestra líneas de asientos", () => {
    renderConfirmation({
      ...ORDER,
      items: ORDER.items.map((item) => ({ ...item, seats: undefined })),
      tickets: ORDER.tickets.map((ticket) => ({ ...ticket, seatLabel: undefined })),
    });

    const card = screen.getByRole("article", { name: "Noche de Sintetizadores" });
    expect(within(card).queryByText(/Fila/)).toBeNull();
    expect(within(card).queryByText(/^(General|VIP):/)).toBeNull();
    expect(within(card).getByText("Zona").nextElementSibling?.textContent).toBe("General, VIP");
  });

  it("Agregar al calendario descarga <slug>.ics con el título del evento", () => {
    renderConfirmation();

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
    renderConfirmation();

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

  it("el talón muestra código y titular de la entrada actual y recorre todas las entradas del pedido", () => {
    renderConfirmation();

    const card = screen.getByRole("article", { name: "Noche de Sintetizadores" });
    const pager = within(card).getByRole("group", { name: "Entradas del pedido" });
    const previous = within(pager).getByRole("button", { name: "Entrada anterior" });
    const next = within(pager).getByRole("button", { name: "Entrada siguiente" });

    expect(pager.className).toContain("print:hidden");
    expect(within(card).getByText(`${CODE}-01`).textContent).toBe(`Código de entrada: ${CODE}-01`);
    expect(within(card).getByText("Titular: Luis Pérez")).toBeTruthy();
    expect(previous.getAttribute("aria-disabled")).toBe("true");

    next.focus();
    fireEvent.click(next);
    expect(within(card).getByRole("img", { name: `Código QR de la entrada ${CODE}-02` })).toBeTruthy();
    expect(within(card).getByText(`${CODE}-02`).textContent).toBe(`Código de entrada: ${CODE}-02`);
    expect(within(card).getByText("Entrada 2 de 3")).toBeTruthy();

    fireEvent.click(next);
    expect(within(card).getByRole("img", { name: `Código QR de la entrada ${CODE}-03` })).toBeTruthy();
    expect(within(card).getByText(`${CODE}-03`).textContent).toBe(`Código de entrada: ${CODE}-03`);
    expect(within(card).getByText("Entrada 3 de 3")).toBeTruthy();
    expect(next.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(next);

    // El cuerpo de la tarjeta no cambia al navegar.
    expect(within(card).getByText("Entradas").nextElementSibling?.textContent).toBe("3");
  });

  it("el talón no muestra la línea Titular si el titular está vacío", () => {
    renderConfirmation({ ...ORDER, tickets: ORDER.tickets.map((ticket) => ({ ...ticket, holderName: " " })) });

    const card = screen.getByRole("article", { name: "Noche de Sintetizadores" });
    expect(within(card).getByText(`${CODE}-01`).textContent).toBe(`Código de entrada: ${CODE}-01`);
    expect(within(card).queryByText(/Titular/)).toBeNull();
  });

  it("con una sola entrada muestra Entrada 1 de 1 con ambas flechas deshabilitadas", () => {
    renderConfirmation({ ...ORDER, ticketCount: 1, tickets: ORDER.tickets.slice(0, 1) });

    const card = screen.getByRole("article", { name: "Noche de Sintetizadores" });
    expect(within(card).getByText("Entrada 1 de 1")).toBeTruthy();
    expect(within(card).getByRole("button", { name: "Entrada anterior" }).getAttribute("aria-disabled")).toBe("true");
    expect(within(card).getByRole("button", { name: "Entrada siguiente" }).getAttribute("aria-disabled")).toBe("true");
  });

  it("Descargar PDF incluye todas las entradas del pedido aunque se vea otra entrada", async () => {
    renderConfirmation();

    fireEvent.click(screen.getByRole("button", { name: "Entrada siguiente" }));
    expect(screen.getByText("Entrada 2 de 3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Descargar PDF" }));

    expect(downloadTicketsPdf).toHaveBeenCalledTimes(1);
    const [input] = vi.mocked(downloadTicketsPdf).mock.calls[0];
    expect(input.tickets.map(({ code }) => code)).toEqual(ORDER.tickets.map(({ code }) => code));
    expect(await screen.findByRole("button", { name: "Descargar PDF" })).toBeTruthy();
  });

  it("no renderiza la región solo-impresión Tus entradas", () => {
    renderConfirmation();

    expect(screen.queryByRole("region", { name: "Tus entradas" })).toBeNull();
    expect(screen.queryByText("Tus entradas")).toBeNull();
  });
});
