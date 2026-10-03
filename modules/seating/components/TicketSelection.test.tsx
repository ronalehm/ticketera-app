import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formatEventPrice } from "@/modules/events/purchase";

import type { GeneralVenueZone, NumberedVenueZone, VenueMap } from "../types/seating.types";
import { TicketSelection } from "./TicketSelection";

// jsdom no tiene layout: el zoom se sustituye por contenedores que solo pintan sus hijos.
vi.mock("react-zoom-pan-pinch", () => ({
  TransformWrapper: ({ children }: { children: ReactNode | ((controls: unknown) => ReactNode) }) => (
    <>{typeof children === "function" ? children({}) : children}</>
  ),
  TransformComponent: ({ children }: { children: ReactNode }) => <>{children}</>,
  useControls: () => ({ zoomIn: vi.fn(), zoomOut: vi.fn(), fitToView: vi.fn() }),
}));

type SeatFixture = NumberedVenueZone["rows"][number]["seats"][number];

// Geometría del requisito 4 para filas de 3 asientos: x = 56, 88, 120; y = 88 + índiceFila·32.
function seat(zoneId: string, row: string, number: number, status: SeatFixture["status"]): SeatFixture {
  const rowIndex = row.charCodeAt(0) - "A".charCodeAt(0);
  return { id: `${zoneId}-${row}-${number}`, row, number, x: 24 + number * 32, y: 88 + rowIndex * 32, status };
}

function generalZone(id: string, name: string, price: number, status: GeneralVenueZone["status"]): GeneralVenueZone {
  return {
    kind: "general",
    id,
    ticketTypeId: id,
    path: "M20 80 H580 V180 H20 Z",
    labelPos: { x: 300, y: 130 },
    capacity: 500,
    name,
    price,
    status,
  };
}

/**
 * Zona numerada de 2 filas × 3 asientos. Disponible: A-1, A-2 libres, A-3 ocupado; B-1 libre, B-2 accesible, B-3
 * ocupado (el mejor asiento suelto es A-2). Agotada: todos ocupados.
 */
function numberedZone(id: string, name: string, price: number, status: NumberedVenueZone["status"]): NumberedVenueZone {
  const soldOut = status === "sold-out";
  return {
    kind: "numbered",
    id,
    ticketTypeId: id,
    path: "M20 200 H580 V300 H20 Z",
    labelPos: { x: 300, y: 250 },
    seatViewBox: "0 0 176 160",
    rows: [
      {
        label: "A",
        seats: [
          seat(id, "A", 1, soldOut ? "occupied" : "available"),
          seat(id, "A", 2, soldOut ? "occupied" : "available"),
          seat(id, "A", 3, "occupied"),
        ],
      },
      {
        label: "B",
        seats: [
          seat(id, "B", 1, soldOut ? "occupied" : "available"),
          seat(id, "B", 2, soldOut ? "occupied" : "accessible"),
          seat(id, "B", 3, "occupied"),
        ],
      },
    ],
    name,
    price,
    status,
  };
}

const MAP: VenueMap = {
  eventSlug: "evento-prueba",
  venue: "Recinto de prueba",
  viewBox: "0 0 600 520",
  stage: { label: "ESCENARIO", path: "M200 16 H400 V60 H200 Z", labelPos: { x: 300, y: 38 } },
  zones: [
    generalZone("vip", "VIP", 550, "low-stock"),
    generalZone("general", "General", 180, "available"),
    numberedZone("norte", "Tribuna Norte", 220, "available"),
    numberedZone("mesa", "Mesa", 300, "sold-out"),
  ],
};

const renderSelection = () => render(<TicketSelection map={MAP} />);

const mapZone = (name: RegExp) => screen.getByRole("button", { name });
const zoneList = () => screen.getByRole("heading", { name: "Entradas" }).closest<HTMLElement>('[data-slot="card"]')!;
const zoneRow = (name: string) => within(zoneList()).getByText(name).closest("li")!;
const add = (name: string) => screen.getByRole("button", { name: `Agregar una entrada de ${name}` });
const remove = (name: string) => screen.getByRole("button", { name: `Quitar una entrada de ${name}` });
const summary = () => screen.getByRole("complementary", { name: "Resumen de la compra" });
const continueLinks = () => screen.queryAllByRole("link", { name: "Continuar" });
const continueButtons = () => screen.queryAllByRole("button", { name: "Continuar" });
const chooseSeats = (name: string) => screen.getByRole("button", { name: `Elegir asientos en ${name}` });
const planHeading = () => screen.queryByRole("heading", { name: "Elige tus asientos" });
const seatAt = (row: string, number: number) =>
  screen.getByRole("checkbox", { name: new RegExp(`^Fila ${row}, asiento ${number},`) });
const removeChip = (label: string) => screen.getByRole("button", { name: `Quitar ${label}` });
const NORTE_A1 = "Tribuna Norte · Fila A · Asiento 1";
const NORTE_B1 = "Tribuna Norte · Fila B · Asiento 1";

afterEach(cleanup);

describe("TicketSelection", () => {
  it("anuncia cada zona del mapa con nombre, precio y estado", () => {
    renderSelection();

    expect(mapZone(/^VIP,/).getAttribute("aria-label")).toBe(`VIP, ${formatEventPrice(550)}, últimas entradas`);
    expect(mapZone(/^Tribuna Norte,/).getAttribute("aria-label")).toBe(
      `Tribuna Norte, ${formatEventPrice(220)}, asientos numerados`,
    );
    expect(mapZone(/^Mesa,/).getAttribute("aria-label")).toBe("Mesa, agotado, asientos numerados");
  });

  it("clic en una zona del mapa la marca como pulsada y resalta su fila de la lista", () => {
    renderSelection();
    fireEvent.click(mapZone(/^General,/));

    expect(mapZone(/^General,/).getAttribute("aria-pressed")).toBe("true");
    for (const other of [/^VIP,/, /^Tribuna Norte,/, /^Mesa,/]) {
      expect(mapZone(other).getAttribute("aria-pressed")).toBe("false");
    }
    expect(zoneRow("General").className).toContain("bg-accent");
    expect(zoneRow("VIP").className).not.toContain("bg-accent");
  });

  it("Enter o Espacio activan una zona sin desplazar la página", () => {
    renderSelection();

    fireEvent.keyDown(mapZone(/^VIP,/), { key: "Enter" });
    expect(mapZone(/^VIP,/).getAttribute("aria-pressed")).toBe("true");

    // fireEvent devuelve false cuando el handler llamó a preventDefault.
    expect(fireEvent.keyDown(mapZone(/^Tribuna Norte,/), { key: " " })).toBe(false);
    expect(mapZone(/^Tribuna Norte,/).getAttribute("aria-pressed")).toBe("true");
    expect(mapZone(/^VIP,/).getAttribute("aria-pressed")).toBe("false");
  });

  it("sin entradas muestra el resumen vacío y los 'Continuar' deshabilitados", () => {
    renderSelection();

    expect(
      within(summary()).getByText("Todavía no elegiste entradas. Toca una zona o usa los botones +."),
    ).toBeTruthy();
    expect(continueLinks()).toHaveLength(0);
    expect(continueButtons()).toHaveLength(2);
    for (const button of continueButtons()) expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(remove("General").getAttribute("aria-disabled")).toBe("true");
  });

  it("'Agregar una entrada' actualiza la cantidad, activa la zona, el total y el enlace de 'Continuar'", () => {
    renderSelection();
    fireEvent.click(add("General"));
    fireEvent.click(add("General"));

    expect(within(zoneRow("General")).getByText("2")).toBeTruthy();
    expect(mapZone(/^General,/).getAttribute("aria-pressed")).toBe("true");

    const aside = within(summary());
    expect(aside.getByText("2 × General")).toBeTruthy();
    expect(aside.getByText("(2 entradas)")).toBeTruthy();
    expect(aside.getAllByText(formatEventPrice(360))).toHaveLength(2); // línea y total
    expect(aside.getByText("Precio final, sin cargos ocultos")).toBeTruthy();
    expect(screen.getByText("Total · 2 entradas")).toBeTruthy();

    expect(continueButtons()).toHaveLength(0);
    expect(continueLinks()).toHaveLength(2);
    for (const link of continueLinks()) {
      expect(link.getAttribute("href")).toBe("/checkout?evento=evento-prueba&general=2");
    }

    fireEvent.click(remove("General"));
    expect(within(zoneRow("General")).getByText("1")).toBeTruthy();
    expect(screen.getByText("Total · 1 entrada")).toBeTruthy();
  });

  it("al llegar a 10 entradas en total deshabilita todos los '+' y avisa en el pie", () => {
    renderSelection();
    expect(within(zoneList()).getByRole("status").textContent).toBe("Máximo 10 entradas por compra.");

    for (let i = 0; i < 6; i++) fireEvent.click(add("General"));
    for (let i = 0; i < 4; i++) fireEvent.click(add("VIP"));

    expect(add("General").getAttribute("aria-disabled")).toBe("true");
    expect(add("VIP").getAttribute("aria-disabled")).toBe("true");
    expect(within(zoneList()).getByRole("status").textContent).toBe(
      "Llegaste al máximo de 10 entradas por compra.",
    );

    fireEvent.click(add("VIP"));
    expect(within(zoneRow("VIP")).getByText("4")).toBeTruthy();
    expect(within(summary()).getByText("(10 entradas)")).toBeTruthy();
  });

  it("una zona agotada muestra 'Agotado' sin stepper", () => {
    renderSelection();
    const row = within(zoneRow("Mesa"));

    expect(row.getByText("Agotado")).toBeTruthy();
    expect(row.queryAllByRole("button")).toHaveLength(0);
  });

  it("una zona numerada muestra su precio y 'Elegir asientos', sin stepper ni plano hasta activarla", () => {
    renderSelection();
    const row = within(zoneRow("Tribuna Norte"));

    expect(row.getByText(`${formatEventPrice(220)} c/u`)).toBeTruthy();
    expect(row.queryByText("Elección de asientos próximamente")).toBeNull();
    expect(row.getAllByRole("button")).toEqual([chooseSeats("Tribuna Norte")]);
    expect(planHeading()).toBeNull();
  });

  it("activar una zona numerada en el mapa muestra su plano sin mover el foco; una agotada no", () => {
    renderSelection();
    const zone = mapZone(/^Tribuna Norte,/);
    zone.focus();
    fireEvent.click(zone);

    expect(planHeading()).toBeTruthy();
    expect(document.activeElement).toBe(zone);
    expect(zoneRow("Tribuna Norte").className).toContain("bg-accent");

    fireEvent.click(mapZone(/^Mesa,/));
    expect(planHeading()).toBeNull();
  });

  it("'Elegir asientos' activa la zona, muestra el plano y enfoca su h2", () => {
    renderSelection();
    fireEvent.click(chooseSeats("Tribuna Norte"));

    expect(mapZone(/^Tribuna Norte,/).getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(planHeading());
    expect(screen.getByText(`Tribuna Norte · ${formatEventPrice(220)} c/u`)).toBeTruthy();
    for (const name of ["Acercar", "Alejar", "Ver todo el plano", "Mejor asiento disponible"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
    expect(screen.getByRole("group", { name: "Plano de asientos de Tribuna Norte" })).toBeTruthy();
    expect(screen.getByRole("list", { name: "Leyenda del plano" })).toBeTruthy();
    expect(screen.getByText("Aún no elegiste asientos.")).toBeTruthy();
    expect(screen.getAllByRole("checkbox")).toHaveLength(6);
  });

  it("clic en un asiento disponible lo marca, añade su chip y actualiza el resumen y la lista", () => {
    renderSelection();
    fireEvent.click(chooseSeats("Tribuna Norte"));
    fireEvent.click(seatAt("A", 1));

    expect(seatAt("A", 1).getAttribute("aria-checked")).toBe("true");
    expect(seatAt("A", 2).getAttribute("aria-checked")).toBe("false");
    expect(removeChip(NORTE_A1)).toBeTruthy();
    expect(screen.queryByText("Aún no elegiste asientos.")).toBeNull();

    const aside = within(summary());
    expect(aside.getByText("1 × Tribuna Norte")).toBeTruthy();
    expect(aside.getByText("Fila A · Asiento 1")).toBeTruthy();
    expect(aside.getAllByText(formatEventPrice(220))).toHaveLength(2); // línea y total
    expect(within(zoneRow("Tribuna Norte")).getByText("1 asiento elegido")).toBeTruthy();

    fireEvent.click(seatAt("B", 2));
    expect(within(zoneRow("Tribuna Norte")).getByText("2 asientos elegidos")).toBeTruthy();

    fireEvent.click(seatAt("A", 1));
    expect(seatAt("A", 1).getAttribute("aria-checked")).toBe("false");
    expect(within(zoneRow("Tribuna Norte")).getByText("1 asiento elegido")).toBeTruthy();
  });

  it("Espacio y Enter alternan el asiento sin desplazar la página", () => {
    renderSelection();
    fireEvent.click(chooseSeats("Tribuna Norte"));

    expect(fireEvent.keyDown(seatAt("A", 2), { key: " " })).toBe(false);
    expect(seatAt("A", 2).getAttribute("aria-checked")).toBe("true");

    expect(fireEvent.keyDown(seatAt("A", 2), { key: "Enter" })).toBe(false);
    expect(seatAt("A", 2).getAttribute("aria-checked")).toBe("false");
  });

  it("las flechas mueven el foco y el único tabIndex 0 del plano", () => {
    renderSelection();
    fireEvent.click(chooseSeats("Tribuna Norte"));
    const tabbable = () => screen.getAllByRole("checkbox").filter((element) => element.getAttribute("tabindex") === "0");

    expect(tabbable()).toEqual([seatAt("A", 1)]);

    expect(fireEvent.keyDown(seatAt("A", 1), { key: "ArrowRight" })).toBe(false);
    expect(document.activeElement).toBe(seatAt("A", 2));
    expect(tabbable()).toEqual([seatAt("A", 2)]);

    fireEvent.keyDown(seatAt("A", 2), { key: "ArrowDown" });
    expect(document.activeElement).toBe(seatAt("B", 2));
    expect(tabbable()).toEqual([seatAt("B", 2)]);
  });

  it("un asiento ocupado no cambia nada con clic ni con Espacio", () => {
    renderSelection();
    fireEvent.click(chooseSeats("Tribuna Norte"));
    const occupied = seatAt("A", 3);

    expect(occupied.getAttribute("aria-label")).toBe("Fila A, asiento 3, ocupado");
    expect(occupied.getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(occupied);
    fireEvent.keyDown(occupied, { key: " " });

    expect(seatAt("A", 3).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("Aún no elegiste asientos.")).toBeTruthy();
    expect(continueLinks()).toHaveLength(0);
  });

  it("'Mejor asiento disponible' elige 1 asiento de la fila más cercana y más centrado y lo anuncia", () => {
    renderSelection();
    fireEvent.click(chooseSeats("Tribuna Norte"));
    fireEvent.click(screen.getByRole("button", { name: "Mejor asiento disponible" }));

    expect(seatAt("A", 2).getAttribute("aria-checked")).toBe("true");
    expect(screen.getAllByRole("checkbox").filter((el) => el.getAttribute("aria-checked") === "true")).toHaveLength(1);
    expect(screen.getByText("Elegimos Fila A · Asiento 2.").getAttribute("role")).toBe("status");
  });

  it("quitar un chip deselecciona el asiento y mueve el foco al chip siguiente o al h2", () => {
    renderSelection();
    fireEvent.click(chooseSeats("Tribuna Norte"));
    fireEvent.click(seatAt("A", 1));
    fireEvent.click(seatAt("B", 1));
    expect(within(summary()).getByText("Fila A · Asiento 1, Fila B · Asiento 1")).toBeTruthy();

    fireEvent.click(removeChip(NORTE_A1));
    expect(seatAt("A", 1).getAttribute("aria-checked")).toBe("false");
    expect(within(summary()).getByText("Fila B · Asiento 1")).toBeTruthy();
    expect(document.activeElement).toBe(removeChip(NORTE_B1));

    fireEvent.click(removeChip(NORTE_B1));
    expect(seatAt("B", 1).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("Aún no elegiste asientos.")).toBeTruthy();
    expect(document.activeElement).toBe(planHeading());
  });

  it("cambiar de zona conserva los asientos y el enlace de 'Continuar' incluye 'asientos'", () => {
    renderSelection();
    fireEvent.click(chooseSeats("Tribuna Norte"));
    fireEvent.click(seatAt("A", 1));
    fireEvent.click(add("General"));

    expect(planHeading()).toBeNull(); // el stepper activó "General"
    expect(within(zoneRow("Tribuna Norte")).getByText("1 asiento elegido")).toBeTruthy();
    expect(screen.getByText("Total · 2 entradas")).toBeTruthy();
    for (const link of continueLinks()) {
      expect(link.getAttribute("href")).toBe("/checkout?evento=evento-prueba&general=1&norte=1&asientos=norte-A-1");
    }

    fireEvent.click(mapZone(/^Tribuna Norte,/));
    expect(seatAt("A", 1).getAttribute("aria-checked")).toBe("true");
    expect(removeChip(NORTE_A1)).toBeTruthy();
  });
});
