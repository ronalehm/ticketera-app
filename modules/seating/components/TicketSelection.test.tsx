import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatEventPrice } from "@/modules/events/purchase";

import type { GeneralVenueZone, NumberedVenueZone, VenueMap } from "../types/seating.types";
import { getAnnularSectorPath, type AnnularSector } from "../utils/annularSector";
import { generateArcSeatRows, getRowEdgeLabelPoints } from "../utils/arcSeatRows";
import { SEAT_PLAN_MARGIN } from "../utils/seatRows";
import { TicketSelection } from "./TicketSelection";

const { zoomToElement } = vi.hoisted(() => ({ zoomToElement: vi.fn(() => Promise.resolve()) }));

// jsdom no tiene layout: el zoom se sustituye por contenedores que solo pintan sus hijos. El nivel de detalle
// (`useTransformInit`/`useTransformEffect`) no se ejecuta; `zoomToElement` se espía para "Mejores butacas".
vi.mock("react-zoom-pan-pinch", () => ({
  TransformWrapper: ({ children }: { children: ReactNode | ((controls: unknown) => ReactNode) }) => (
    <>{typeof children === "function" ? children({}) : children}</>
  ),
  TransformComponent: ({ children }: { children: ReactNode }) => <>{children}</>,
  useControls: () => ({ zoomIn: vi.fn(), zoomOut: vi.fn(), fitToView: vi.fn(), zoomToElement }),
  useTransformInit: vi.fn(),
  useTransformEffect: vi.fn(),
}));

type SeatFixture = NumberedVenueZone["rows"][number]["seats"][number];

// Geometría del requisito 4 para filas de 3 asientos: x = 56, 88, 120; y = 88 + índiceFila·32.
function seat(zoneId: string, row: string, number: number, status: SeatFixture["status"]): SeatFixture {
  const rowIndex = row.charCodeAt(0) - "A".charCodeAt(0);
  return { id: `${zoneId}-${row}-${number}`, row, number, x: 24 + number * 32, y: 88 + rowIndex * 32, status };
}

/** Bandas horizontales de 600 de ancho; cada zona tiene su propio `path` para distinguir el trazo de resaltado. */
function band(top: number, height: number) {
  return { path: `M20 ${top} H580 V${top + height} H20 Z`, labelPos: { x: 300, y: top + height / 2 } };
}

function generalZone(
  id: string,
  name: string,
  price: number,
  status: GeneralVenueZone["status"],
  shape: ReturnType<typeof band>,
): GeneralVenueZone {
  return { kind: "general", id, ticketTypeId: id, ...shape, capacity: 500, name, price, status };
}

/**
 * Zona numerada de 2 filas × 3 asientos. Disponible: A-1, A-2 libres, A-3 ocupado; B-1 libre, B-2 accesible, B-3
 * ocupado (el mejor asiento suelto es A-2). Agotada: todos ocupados.
 */
function numberedZone(
  id: string,
  name: string,
  price: number,
  status: NumberedVenueZone["status"],
  shape: ReturnType<typeof band>,
): NumberedVenueZone {
  const soldOut = status === "sold-out";
  return {
    kind: "numbered",
    id,
    ticketTypeId: id,
    ...shape,
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

const VIP_BAND = band(80, 50);

const MAP: VenueMap = {
  eventSlug: "evento-prueba",
  venue: "Recinto de prueba",
  viewBox: "0 0 600 520",
  stage: { label: "ESCENARIO", path: "M200 16 H400 V60 H200 Z", labelPos: { x: 300, y: 38 } },
  zones: [
    generalZone("vip", "VIP", 550, "low-stock", VIP_BAND),
    generalZone("general", "General", 180, "available", band(130, 50)),
    numberedZone("norte", "Tribuna Norte", 220, "available", band(200, 100)),
    numberedZone("mesa", "Mesa", 300, "sold-out", band(320, 100)),
  ],
};

/** Sector de prueba (2 filas de 2 butacas), concéntrico con un escenario semicircular como el del festival. */
const ARC_SECTOR: AnnularSector = { cx: 300, cy: 54, innerRadius: 102, outerRadius: 180, startAngle: -10, endAngle: 30 };

const ARC_ZONE: NumberedVenueZone = {
  kind: "numbered",
  id: "oriente",
  ticketTypeId: "oriente",
  path: getAnnularSectorPath(ARC_SECTOR),
  labelPos: { x: 470, y: 90 },
  ...generateArcSeatRows({ zoneId: "oriente", sector: ARC_SECTOR, scale: 1, rowLabels: ["A", "B"], occupiedRatio: 0 }),
  name: "Tribuna Oriente",
  price: 155,
  status: "available",
};

/** `MAP` con un escenario con luces y una zona numerada en arco (con `planTransform`). */
const ARC_MAP: VenueMap = {
  ...MAP,
  stage: {
    ...MAP.stage,
    path: getAnnularSectorPath({ cx: 300, cy: 54, innerRadius: 0, outerRadius: 90, startAngle: -10, endAngle: 190 }),
    lights: [
      { x: 260, y: 100 },
      { x: 340, y: 100 },
    ],
  },
  zones: [...MAP.zones, ARC_ZONE],
};

const renderSelection = () => render(<TicketSelection map={MAP} />);

const mapGroup = () => screen.queryByRole("group", { name: "Mapa de zonas de Recinto de prueba" });
const mapZone = (name: string) => within(mapGroup()!).getByRole("button", { name: new RegExp(`^${name},`) });
const mapLabelLayer = () => mapGroup()!.parentElement!.querySelector<HTMLElement>(':scope > div[aria-hidden="true"]')!;
const mapLabel = (name: string) => within(mapLabelLayer()).getByText(name).closest("div")!;
const highlightStroke = () => mapGroup()!.querySelector('path[aria-hidden="true"].stroke-brand-navy');
const zoneCardList = () => screen.queryByRole("list", { name: "Zonas" });
const zoneCard = (name: string) => within(zoneCardList()!).getByRole("button", { name: new RegExp(`^${name},`) });
const stepIndicator = () => screen.getByText(/^Paso \d de 2 · /);
const zoneHeading = (name: string) => screen.getByRole("heading", { level: 3, name });
const backButton = () => screen.getByRole("button", { name: "Todas las zonas" });
const add = (name: string) => screen.getByRole("button", { name: `Agregar una entrada de ${name}` });
const remove = (name: string) => screen.getByRole("button", { name: `Quitar una entrada de ${name}` });
const quantityGroup = () => screen.getByRole("group", { name: "Cantidad" });
const subtotal = () => screen.getByText("Subtotal").parentElement!;
const summary = () => screen.getByRole("complementary", { name: "Resumen de la compra" });
const continueLinks = () => screen.queryAllByRole("link", { name: "Continuar" });
const continueButtons = () => screen.queryAllByRole("button", { name: "Continuar" });
const seatCounter = () => screen.getByText(/^\d+ de \d+ butacas$/);
const seatAt = (row: string, number: number) =>
  screen.getByRole("checkbox", { name: new RegExp(`^Fila ${row}, asiento ${number},`) });
const removeChip = (label: string) => screen.getByRole("button", { name: `Quitar ${label}` });
const planGroup = (name = "Tribuna Norte") => screen.getByRole("group", { name: `Plano de asientos de ${name}` });
const zoomGroup = () => screen.getByRole("group", { name: "Zoom del plano" });
const legend = () => screen.getByRole("list", { name: "Leyenda del plano" });
const selectedInZoneText = () => screen.getByText(/^\d+ elegidas?$/);
const tooltip = () => document.querySelector<HTMLElement>('div[aria-hidden="true"].bg-brand-navy');
const bestSeatsGroup = () => screen.getByRole("group", { name: "¿Cuántas butacas juntas?" });
const pickButton = () => screen.getByRole("button", { name: /^Elegir (las mejores butacas|la mejor butaca)$/ });
const checkedSeatIds = () =>
  screen
    .getAllByRole("checkbox")
    .filter((element) => element.getAttribute("aria-checked") === "true")
    .map((element) => element.getAttribute("data-seat-id"));
/** Minimapa: el único SVG decorativo con el `viewBox` del mapa de zonas. */
const minimap = (map: VenueMap = MAP) => document.querySelector<SVGSVGElement>(`svg[aria-hidden="true"][viewBox="${map.viewBox}"]`);
/** Fondo del estadio: el grupo decorativo con la transformación estadio → plano. */
const planBackdrop = (name: string) => planGroup(name).querySelector<SVGGElement>(':scope > g[aria-hidden="true"][transform]');
const animatedStep = (zoomClass: string) => document.querySelector<HTMLElement>(`[class*="${zoomClass}"]`);
const NORTE_A1 = "Tribuna Norte · Fila A · Asiento 1";
const NORTE_B1 = "Tribuna Norte · Fila B · Asiento 1";

function openNorte() {
  fireEvent.click(zoneCard("Tribuna Norte"));
}

afterEach(cleanup);

describe("TicketSelection · sub-paso 1", () => {
  it("muestra una sola tarjeta 'Elige tus entradas' con el indicador 'Paso 1 de 2', el mapa y las tarjetas", () => {
    renderSelection();

    expect(screen.getByRole("region", { name: "Elige tus entradas" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Elige tus entradas",
      "Tu compra",
    ]);
    expect(stepIndicator().textContent).toBe("Paso 1 de 2 · Elige una zona");
    expect(stepIndicator().getAttribute("aria-live")).toBe("polite");
    expect(within(mapGroup()!).getAllByRole("button")).toHaveLength(4);
    expect(within(zoneCardList()!).getAllByRole("button")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Todas las zonas" })).toBeNull();
    // Primer render sin animación.
    expect(animatedStep("zoom-in")).toBeNull();
  });

  it("anuncia cada zona del mapa y cada tarjeta con nombre, precio y estado", () => {
    renderSelection();

    expect(mapZone("VIP").getAttribute("aria-label")).toBe(`VIP, ${formatEventPrice(550)}, últimas entradas`);
    expect(mapZone("Tribuna Norte").getAttribute("aria-label")).toBe(
      `Tribuna Norte, ${formatEventPrice(220)}, asientos numerados`,
    );
    expect(mapZone("Mesa").getAttribute("aria-label")).toBe("Mesa, agotado, asientos numerados");

    expect(zoneCard("VIP").getAttribute("aria-label")).toBe(
      `VIP, ${formatEventPrice(550)} c/u, general sin butaca, últimas entradas`,
    );
    expect(zoneCard("Tribuna Norte").getAttribute("aria-label")).toBe(
      `Tribuna Norte, ${formatEventPrice(220)} c/u, numerada, elige tu butaca`,
    );
  });

  it("pinta la etiqueta HTML de cada zona con su nombre y su precio (o 'Agotado')", () => {
    renderSelection();

    expect(within(mapLabelLayer()).getByText("ESCENARIO")).toBeTruthy();
    for (const zone of MAP.zones) {
      const price = zone.status === "sold-out" ? "Agotado" : formatEventPrice(zone.price);
      expect(mapLabel(zone.name).textContent).toContain(price);
    }
    expect(mapLabel("VIP").textContent).toContain("Últimas entradas");
  });

  it("sin entradas muestra el resumen vacío y los 'Continuar' deshabilitados", () => {
    renderSelection();

    expect(
      within(summary()).getByText("Todavía no elegiste entradas. Empieza eligiendo una zona."),
    ).toBeTruthy();
    expect(continueLinks()).toHaveLength(0);
    expect(continueButtons()).toHaveLength(2);
    for (const button of continueButtons()) expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("TicketSelection · resaltado sincronizado", () => {
  it("el puntero sobre una tarjeta delinea su zona en el mapa y atenúa las demás; al salir se quita", () => {
    renderSelection();
    fireEvent.pointerEnter(zoneCard("General"));

    expect(highlightStroke()?.getAttribute("d")).toBe(MAP.zones[1].path);
    expect(zoneCard("General").getAttribute("data-highlighted")).toBe("true");
    expect(mapZone("General").getAttribute("class")).not.toContain("opacity-40");
    for (const other of ["VIP", "Tribuna Norte", "Mesa"]) {
      expect(mapZone(other).getAttribute("class")).toContain("opacity-40");
      expect(mapLabel(other).className).toContain("opacity-40");
    }

    fireEvent.pointerLeave(zoneCard("General"));
    expect(highlightStroke()).toBeNull();
    expect(zoneCard("General").getAttribute("data-highlighted")).toBe("false");
    expect(mapZone("VIP").getAttribute("class")).not.toContain("opacity-40");
  });

  it("el puntero sobre una zona del mapa resalta su tarjeta", () => {
    renderSelection();
    fireEvent.pointerEnter(mapZone("VIP"));

    expect(zoneCard("VIP").getAttribute("data-highlighted")).toBe("true");
    expect(zoneCard("General").getAttribute("data-highlighted")).toBe("false");
    expect(highlightStroke()?.getAttribute("d")).toBe(VIP_BAND.path);

    fireEvent.pointerLeave(mapZone("VIP"));
    expect(zoneCard("VIP").getAttribute("data-highlighted")).toBe("false");
  });

  it("el foco en una tarjeta o en una zona resalta igual que el puntero; al perderlo se quita", () => {
    renderSelection();

    act(() => zoneCard("Tribuna Norte").focus());
    expect(highlightStroke()?.getAttribute("d")).toBe(MAP.zones[2].path);
    act(() => zoneCard("Tribuna Norte").blur());
    expect(highlightStroke()).toBeNull();

    act(() => mapZone("General").focus());
    expect(zoneCard("General").getAttribute("data-highlighted")).toBe("true");
    act(() => mapZone("General").blur());
    expect(zoneCard("General").getAttribute("data-highlighted")).toBe("false");
  });

  it("una zona agotada no se resalta ni desde su tarjeta ni desde el mapa", () => {
    renderSelection();

    fireEvent.pointerEnter(zoneCard("Mesa"));
    act(() => mapZone("Mesa").focus());

    expect(highlightStroke()).toBeNull();
    expect(zoneCard("Mesa").getAttribute("data-highlighted")).toBe("false");
    expect(mapZone("VIP").getAttribute("class")).not.toContain("opacity-40");
  });
});

describe("TicketSelection · zona de pie", () => {
  it("clic en una zona del mapa abre el sub-paso 2: indicador, cabecera, foco en el h3 y sin mapa ni tarjetas", () => {
    renderSelection();
    fireEvent.click(mapZone("VIP"));

    expect(stepIndicator().textContent).toBe("Paso 2 de 2 · Elige la cantidad");
    expect(document.activeElement).toBe(zoneHeading("VIP"));
    expect(screen.getByRole("navigation", { name: "Ruta de selección" }).textContent).toContain("Todas las zonas");
    expect(screen.getByText(`· ${formatEventPrice(550)} c/u`)).toBeTruthy();
    expect(screen.getByText("General · sin butaca")).toBeTruthy();
    expect(within(quantityGroup()).getByText("0")).toBeTruthy();
    expect(subtotal().textContent).toContain(formatEventPrice(0));
    expect(mapGroup()).toBeNull();
    expect(zoneCardList()).toBeNull();
  });

  it("el sub-paso 2 entra creciendo desde la etiqueta de la zona", () => {
    renderSelection();
    fireEvent.click(mapZone("VIP"));

    const step = animatedStep("zoom-in-95");
    expect(step?.className).toContain("motion-safe:animate-in");
    expect(step?.style.transformOrigin).toBe(`50% ${(VIP_BAND.labelPos.y / 520) * 100}%`);
  });

  it("Enter o Espacio sobre una zona del mapa la abren sin desplazar la página", () => {
    renderSelection();

    // fireEvent devuelve false cuando el handler llamó a preventDefault.
    expect(fireEvent.keyDown(mapZone("General"), { key: " " })).toBe(false);
    expect(document.activeElement).toBe(zoneHeading("General"));

    fireEvent.click(backButton());
    expect(fireEvent.keyDown(mapZone("VIP"), { key: "Enter" })).toBe(false);
    expect(document.activeElement).toBe(zoneHeading("VIP"));
  });

  it("−/+ actualizan la cantidad, el subtotal, el total y el enlace de 'Continuar'", () => {
    renderSelection();
    fireEvent.click(zoneCard("VIP"));
    expect(remove("VIP").getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(add("VIP"));
    fireEvent.click(add("VIP"));

    expect(within(quantityGroup()).getByText("2")).toBeTruthy();
    expect(subtotal().textContent).toContain(formatEventPrice(1100));
    const aside = within(summary());
    expect(aside.getByText("2 × VIP")).toBeTruthy();
    expect(aside.getByText("(2 entradas)")).toBeTruthy();
    expect(aside.getAllByText(formatEventPrice(1100))).toHaveLength(2); // línea y total
    expect(screen.getByText("Total · 2 entradas")).toBeTruthy();
    expect(continueButtons()).toHaveLength(0);
    for (const link of continueLinks()) {
      expect(link.getAttribute("href")).toBe("/checkout?evento=evento-prueba&vip=2");
    }

    fireEvent.click(remove("VIP"));
    expect(within(quantityGroup()).getByText("1")).toBeTruthy();
    expect(subtotal().textContent).toContain(formatEventPrice(550));
    expect(screen.getByText("Total · 1 entrada")).toBeTruthy();
  });

  it("'Todas las zonas' vuelve al sub-paso 1, enfoca la tarjeta y conserva la selección", () => {
    renderSelection();
    fireEvent.click(zoneCard("VIP"));
    fireEvent.click(add("VIP"));
    fireEvent.click(add("VIP"));
    fireEvent.click(backButton());

    expect(stepIndicator().textContent).toBe("Paso 1 de 2 · Elige una zona");
    expect(document.activeElement).toBe(zoneCard("VIP"));
    expect(zoneCard("VIP").getAttribute("aria-label")).toMatch(/, 2 entradas elegidas$/);
    expect(within(zoneCard("VIP")).getByText("2 entradas elegidas")).toBeTruthy();
    expect(mapZone("VIP").getAttribute("aria-label")).toMatch(/, 2 entradas elegidas$/);
    expect(within(mapLabel("VIP")).getByText("2")).toBeTruthy();
    expect(within(summary()).getByText("2 × VIP")).toBeTruthy();

    // Vuelve "alejándose" desde la zona que se cerró.
    const step = animatedStep("zoom-in-105");
    expect(step?.contains(mapGroup())).toBe(true);
    expect(step?.style.transformOrigin).toBe(`50% ${(VIP_BAND.labelPos.y / 520) * 100}%`);
  });

  it("al llegar a 10 entradas en total deshabilita '+' y avisa en el pie", () => {
    renderSelection();
    fireEvent.click(zoneCard("General"));
    expect(screen.getByText("Máximo 10 entradas por compra.").getAttribute("role")).toBe("status");

    for (let i = 0; i < 11; i++) fireEvent.click(add("General"));

    expect(within(quantityGroup()).getByText("10")).toBeTruthy();
    expect(add("General").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("status").textContent).toBe("Llegaste al máximo de 10 entradas por compra.");
    expect(within(summary()).getByText("(10 entradas)")).toBeTruthy();

    fireEvent.click(backButton());
    fireEvent.click(zoneCard("VIP"));
    expect(add("VIP").getAttribute("aria-disabled")).toBe("true");
  });
});

describe("TicketSelection · zona agotada", () => {
  it("ni el clic ni Enter en el mapa ni en la tarjeta abren el sub-paso 2", () => {
    renderSelection();

    expect(mapZone("Mesa").getAttribute("aria-disabled")).toBe("true");
    expect(zoneCard("Mesa").getAttribute("aria-disabled")).toBe("true");
    expect(zoneCard("Mesa").getAttribute("aria-label")).toBe("Mesa, agotado, numerada, elige tu butaca");
    expect(within(zoneCard("Mesa")).getByText("Agotado")).toBeTruthy();
    expect(within(zoneCard("Mesa")).queryByText("c/u")).toBeNull();

    fireEvent.click(mapZone("Mesa"));
    expect(fireEvent.keyDown(mapZone("Mesa"), { key: "Enter" })).toBe(false);
    fireEvent.click(zoneCard("Mesa"));

    expect(stepIndicator().textContent).toBe("Paso 1 de 2 · Elige una zona");
    expect(mapGroup()).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Todas las zonas" })).toBeNull();
  });
});

describe("TicketSelection · zona numerada", () => {
  it("la tarjeta abre el plano con el contador 'n de m butacas' y enfoca el h3", () => {
    renderSelection();
    openNorte();

    expect(stepIndicator().textContent).toBe("Paso 2 de 2 · Elige tus butacas");
    expect(document.activeElement).toBe(zoneHeading("Tribuna Norte"));
    expect(screen.getByText(`· ${formatEventPrice(220)} c/u`)).toBeTruthy();
    expect(screen.getByText("Numerada · elige tu butaca")).toBeTruthy();
    expect(seatCounter().textContent).toBe("0 de 10 butacas");
    expect(seatCounter().getAttribute("aria-live")).toBe("polite");
    expect(within(zoomGroup()).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "Acercar",
      "Alejar",
      "Ver todo el plano",
    ]);
    expect(screen.getByText("¿Cuántas butacas juntas?")).toBeTruthy();
    expect(pickButton().textContent).toBe("Elegir las mejores butacas");
    expect(screen.getByRole("group", { name: "Plano de asientos de Tribuna Norte" })).toBeTruthy();
    expect(screen.getByRole("list", { name: "Leyenda del plano" })).toBeTruthy();
    expect(screen.getByText("Aún no elegiste asientos.")).toBeTruthy();
    expect(screen.getAllByRole("checkbox")).toHaveLength(6);
    expect(mapGroup()).toBeNull();
  });

  it("el contador descuenta las entradas de otras zonas y se actualiza al elegir", () => {
    renderSelection();
    fireEvent.click(zoneCard("VIP"));
    fireEvent.click(add("VIP"));
    fireEvent.click(add("VIP"));
    fireEvent.click(backButton());
    openNorte();

    expect(seatCounter().textContent).toBe("0 de 8 butacas");
    fireEvent.click(seatAt("A", 1));
    expect(seatCounter().textContent).toBe("1 de 8 butacas");
    fireEvent.click(seatAt("B", 1));
    expect(seatCounter().textContent).toBe("2 de 8 butacas");
  });

  it("clic en un asiento disponible lo marca, añade su chip y actualiza el resumen y la tarjeta", () => {
    renderSelection();
    openNorte();
    fireEvent.click(seatAt("A", 1));

    expect(seatAt("A", 1).getAttribute("aria-checked")).toBe("true");
    expect(seatAt("A", 2).getAttribute("aria-checked")).toBe("false");
    expect(removeChip(NORTE_A1)).toBeTruthy();
    expect(screen.queryByText("Aún no elegiste asientos.")).toBeNull();

    const aside = within(summary());
    expect(aside.getByText("1 × Tribuna Norte")).toBeTruthy();
    expect(aside.getByText("Fila A · Asiento 1")).toBeTruthy();
    expect(aside.getAllByText(formatEventPrice(220))).toHaveLength(2); // línea y total

    fireEvent.click(seatAt("B", 2));
    fireEvent.click(seatAt("A", 1));
    expect(seatAt("A", 1).getAttribute("aria-checked")).toBe("false");

    fireEvent.click(backButton());
    expect(document.activeElement).toBe(zoneCard("Tribuna Norte"));
    expect(within(zoneCard("Tribuna Norte")).getByText("1 butaca elegida")).toBeTruthy();
    expect(zoneCard("Tribuna Norte").getAttribute("aria-label")).toMatch(/, 1 butaca elegida$/);
  });

  it("Espacio y Enter alternan el asiento sin desplazar la página", () => {
    renderSelection();
    openNorte();

    expect(fireEvent.keyDown(seatAt("A", 2), { key: " " })).toBe(false);
    expect(seatAt("A", 2).getAttribute("aria-checked")).toBe("true");

    expect(fireEvent.keyDown(seatAt("A", 2), { key: "Enter" })).toBe(false);
    expect(seatAt("A", 2).getAttribute("aria-checked")).toBe("false");
  });

  it("las flechas mueven el foco y el único tabIndex 0 del plano", () => {
    renderSelection();
    openNorte();
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
    openNorte();
    const occupied = seatAt("A", 3);

    expect(occupied.getAttribute("aria-label")).toBe("Fila A, asiento 3, ocupado");
    expect(occupied.getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(occupied);
    fireEvent.keyDown(occupied, { key: " " });

    expect(seatAt("A", 3).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("Aún no elegiste asientos.")).toBeTruthy();
    expect(continueLinks()).toHaveLength(0);
  });

  it("quitar un chip deselecciona el asiento y mueve el foco al chip siguiente o, con el último, al h3", () => {
    renderSelection();
    openNorte();
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
    expect(document.activeElement).toBe(zoneHeading("Tribuna Norte"));
  });

  it("cambiar de zona conserva los asientos y el enlace de 'Continuar' incluye 'asientos'", () => {
    renderSelection();
    openNorte();
    fireEvent.click(seatAt("A", 1));
    fireEvent.click(backButton());
    fireEvent.click(zoneCard("General"));
    fireEvent.click(add("General"));

    expect(screen.getByText("Total · 2 entradas")).toBeTruthy();
    for (const link of continueLinks()) {
      expect(link.getAttribute("href")).toBe("/checkout?evento=evento-prueba&general=1&norte=1&asientos=norte-A-1");
    }

    fireEvent.click(backButton());
    expect(within(mapLabel("Tribuna Norte")).getByText("1")).toBeTruthy();
    openNorte();
    expect(seatAt("A", 1).getAttribute("aria-checked")).toBe("true");
    expect(removeChip(NORTE_A1)).toBeTruthy();
    expect(seatCounter().textContent).toBe("1 de 9 butacas");
  });
});

describe("TicketSelection · plano renovado", () => {
  it("las disponibles llevan su número oculto, las ocupadas no y las accesibles tienen el icono", () => {
    renderSelection();
    openNorte();

    const number = seatAt("A", 1).querySelector("text");
    expect(number?.textContent).toBe("1");
    expect(number?.closest('[aria-hidden="true"]')).toBeTruthy();
    expect(number?.getAttribute("class")).toContain("group-data-[detail=numbers]/plan:opacity-100");
    expect(seatAt("A", 3).querySelector("text")).toBeNull();
    expect(seatAt("B", 2).querySelector("text")).toBeNull();
    expect(seatAt("B", 2).querySelector("svg.lucide-accessibility")).toBeTruthy();
  });

  it("la leyenda muestra el precio, 'Elegida', 'Ocupada', la accesible y 'n elegidas', que se actualiza", () => {
    renderSelection();
    openNorte();

    expect(within(legend()).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      `Disponible · ${formatEventPrice(220)}`,
      "Elegida",
      "Ocupada",
      "Accesible (silla de ruedas)",
    ]);
    expect(selectedInZoneText().textContent).toBe("0 elegidas");
    expect(selectedInZoneText().getAttribute("aria-live")).toBe("polite");

    fireEvent.click(seatAt("A", 1));
    expect(selectedInZoneText().textContent).toBe("1 elegida");
    fireEvent.click(seatAt("B", 2));
    expect(selectedInZoneText().textContent).toBe("2 elegidas");
  });

  it("sin butacas accesibles la leyenda no muestra 'Accesible (silla de ruedas)'", () => {
    const norte = MAP.zones[2] as NumberedVenueZone;
    const withoutAccessible: NumberedVenueZone = {
      ...norte,
      rows: norte.rows.map((row) => ({
        ...row,
        seats: row.seats.map((s) => (s.status === "accessible" ? { ...s, status: "available" as const } : s)),
      })),
    };
    render(<TicketSelection map={{ ...MAP, zones: [withoutAccessible] }} />);
    openNorte();

    expect(within(legend()).getAllByRole("listitem")).toHaveLength(3);
    expect(within(legend()).queryByText("Accesible (silla de ruedas)")).toBeNull();
  });

  it("en cuadrícula pinta la letra de cada fila en los dos márgenes y la barra del escenario", () => {
    renderSelection();
    openNorte();

    const width = 176; // `seatViewBox` del fixture
    for (const row of ["A", "B"]) {
      const labels = within(planGroup()).getAllByText(row);
      expect(labels.map((label) => label.getAttribute("x"))).toEqual([
        String(SEAT_PLAN_MARGIN.x / 2),
        String(width - SEAT_PLAN_MARGIN.x / 2),
      ]);
      for (const label of labels) expect(label.closest('[aria-hidden="true"]')).toBeTruthy();
    }
    expect(within(planGroup()).getByText("ESCENARIO")).toBeTruthy();
  });
});

describe("TicketSelection · plano en arco", () => {
  function openOriente() {
    render(<TicketSelection map={ARC_MAP} />);
    fireEvent.click(zoneCard("Tribuna Oriente"));
  }

  it("pinta debajo de las butacas el fondo del estadio con la zona abierta en lila y el resto en gris", () => {
    openOriente();

    const backdrop = planBackdrop("Tribuna Oriente")!;
    const { scale, x, y } = ARC_ZONE.planTransform!;
    expect(backdrop.getAttribute("transform")).toBe(`translate(${x} ${y}) scale(${scale})`);
    expect(backdrop.getAttribute("class")).toContain("pointer-events-none");
    // Debajo de todo: el primer hijo del plano, antes de las letras y de las butacas.
    expect(planGroup("Tribuna Oriente").firstElementChild).toBe(backdrop);

    expect(backdrop.querySelector(`path.fill-brand-navy[d="${ARC_MAP.stage.path}"]`)).toBeTruthy();
    expect(backdrop.querySelectorAll("circle.fill-highlight")).toHaveLength(2);

    const active = backdrop.querySelector(`path[d="${ARC_ZONE.path}"]`)!;
    expect(active.getAttribute("class")).toBe("fill-accent stroke-primary");
    const others = backdrop.querySelectorAll("path.fill-secondary.stroke-background");
    expect(others).toHaveLength(ARC_MAP.zones.length - 1);
    for (const path of [active, ...others]) {
      expect(path.getAttribute("vector-effect")).toBe("non-scaling-stroke");
      expect(path.getAttribute("stroke-width")).toBe("2");
    }
    expect(backdrop.querySelector("text")).toBeNull();
    expect(planGroup("Tribuna Oriente").getAttribute("class")).toContain("overflow-visible");
  });

  it("muestra el minimapa decorativo con el estadio, la zona abierta resaltada y el recuadro del plano entero", () => {
    openOriente();

    const map = minimap(ARC_MAP)!;
    expect(map).toBeTruthy();
    expect(map.querySelector(`path.fill-primary[d="${ARC_ZONE.path}"]`)).toBeTruthy();
    expect(map.querySelector(`path.fill-brand-navy[d="${ARC_MAP.stage.path}"]`)).toBeTruthy();
    expect(map.querySelectorAll("path.fill-secondary")).toHaveLength(ARC_MAP.zones.length - 1);
    expect(map.querySelector("[tabindex]")).toBeNull();
    // Sin medidas (jsdom), el recuadro es el plano entero pasado a coordenadas del estadio.
    const { scale, x } = ARC_ZONE.planTransform!;
    expect(Number(map.querySelector("rect")!.getAttribute("x"))).toBeCloseTo(-x / scale);
    // Superpuesto arriba a la izquierda desde `sm`, sin interceptar gestos; en móvil va en la barra con el zoom.
    const overlay = map.parentElement!;
    expect(overlay.className).toContain("pointer-events-none");
    expect(overlay.className).toContain("sm:absolute sm:top-3 sm:left-3 sm:z-10");
    expect(overlay.parentElement).toBe(zoomGroup().parentElement);
  });

  it("el lienzo es apaisado desde sm, con franja inferior solo si es estrecho y minimapa según su ancho, y conserva la proporción del plano en móvil", () => {
    openOriente();

    const svg = planGroup("Tribuna Oriente");
    const canvas = svg.closest<HTMLElement>(".touch-none")!;
    expect(canvas.className).toContain("sm:aspect-[16/10]");
    expect(canvas.style.getPropertyValue("--plan-aspect")).toBe(ARC_ZONE.seatViewBox.split(" ").slice(2).join(" / "));
    // Franja inferior para el zoom solo con el lienzo estrecho (< 42rem), nunca sin condición.
    const strip = svg.parentElement!.classList;
    expect(strip).toContain("sm:@max-2xl:pb-16");
    expect(strip).not.toContain("sm:pb-16");
    // El bloque del lienzo es el contenedor de las consultas `@`; el minimapa crece con su ancho.
    expect(canvas.parentElement!.classList).toContain("@container");
    expect(minimap(ARC_MAP)!.classList).toContain("@2xl:w-28");
  });

  it("pinta 2 letras por fila de 13 unidades en los puntos de getRowEdgeLabelPoints y sin barra 'ESCENARIO'", () => {
    openOriente();

    for (const row of ARC_ZONE.rows) {
      const { start, end } = getRowEdgeLabelPoints(row);
      const labels = within(planGroup("Tribuna Oriente")).getAllByText(row.label);
      expect(labels.map((label) => [Number(label.getAttribute("x")), Number(label.getAttribute("y"))])).toEqual([
        [start.x, start.y],
        [end.x, end.y],
      ]);
      for (const label of labels) {
        expect(label.getAttribute("font-size")).toBe("13");
        expect(label.getAttribute("class")).toBe("fill-muted-foreground font-bold");
        expect(label.getAttribute("text-anchor")).toBe("middle");
        expect(label.getAttribute("dominant-baseline")).toBe("central");
        expect(label.closest('[aria-hidden="true"]')).toBeTruthy();
      }
    }
    expect(within(planGroup("Tribuna Oriente")).queryByText("ESCENARIO")).toBeNull();
  });

  it("el teclado y el clic siguen eligiendo butacas sobre el fondo", () => {
    openOriente();

    fireEvent.click(seatAt("A", 1));
    expect(checkedSeatIds()).toEqual(["oriente-A-1"]);
    fireEvent.keyDown(seatAt("A", 1), { key: "ArrowRight" });
    fireEvent.keyDown(document.activeElement!, { key: " " });
    expect(checkedSeatIds()).toEqual(["oriente-A-1", "oriente-A-2"]);
  });

  it("una zona en cuadrícula no tiene fondo ni minimapa, conserva su proporción y la franja del zoom", () => {
    render(<TicketSelection map={ARC_MAP} />);
    openNorte();

    expect(planBackdrop("Tribuna Norte")).toBeNull();
    expect(minimap(ARC_MAP)).toBeNull();
    const svg = planGroup();
    const canvas = svg.closest<HTMLElement>(".touch-none")!;
    expect(canvas.className).not.toContain("sm:aspect-[16/10]");
    expect(canvas.style.getPropertyValue("--plan-aspect")).toBe("176 / 160");
    expect(svg.parentElement!.className).toContain("sm:pb-16");
    expect(svg.getAttribute("class")).not.toContain("overflow-visible");
    for (const label of within(svg).getAllByText("A")) expect(label.getAttribute("font-size")).toBe("13");
  });
});

describe("TicketSelection · tooltip de butaca", () => {
  it("con el ratón sobre una butaca muestra fila, butaca y precio; al salir se oculta", () => {
    renderSelection();
    openNorte();
    expect(tooltip()).toBeNull();

    fireEvent.pointerOver(seatAt("A", 2), { pointerType: "mouse" });
    expect(tooltip()?.textContent).toBe(`Fila A · Asiento 2${formatEventPrice(220)}`);
    expect(within(tooltip()!).getByText("Fila A · Asiento 2").className).toContain("font-bold");

    fireEvent.pointerOut(seatAt("A", 2), { pointerType: "mouse", relatedTarget: document.body });
    expect(tooltip()).toBeNull();
  });

  it("dice 'Ocupada', 'Accesible · S/ X' o 'Elegida · S/ X' según la butaca", () => {
    renderSelection();
    openNorte();

    fireEvent.pointerOver(seatAt("A", 3), { pointerType: "mouse" });
    expect(within(tooltip()!).getByText("Ocupada")).toBeTruthy();

    fireEvent.pointerOver(seatAt("B", 2), { pointerType: "mouse" });
    expect(within(tooltip()!).getByText(`Accesible · ${formatEventPrice(220)}`)).toBeTruthy();

    fireEvent.click(seatAt("A", 1));
    fireEvent.pointerOver(seatAt("A", 1), { pointerType: "mouse" });
    expect(within(tooltip()!).getByText(`Elegida · ${formatEventPrice(220)}`)).toBeTruthy();
  });

  it("en táctil no aparece", () => {
    renderSelection();
    openNorte();

    fireEvent.pointerOver(seatAt("A", 2), { pointerType: "touch" });
    expect(tooltip()).toBeNull();
  });

  it("el foco por teclado lo muestra y las flechas lo llevan a la butaca enfocada; con blur se oculta", () => {
    renderSelection();
    openNorte();

    act(() => seatAt("A", 1).focus());
    expect(within(tooltip()!).getByText("Fila A · Asiento 1")).toBeTruthy();

    fireEvent.keyDown(seatAt("A", 1), { key: "ArrowDown" });
    expect(document.activeElement).toBe(seatAt("B", 1));
    expect(within(tooltip()!).getByText("Fila B · Asiento 1")).toBeTruthy();

    act(() => seatAt("B", 1).blur());
    expect(tooltip()).toBeNull();
  });
});

describe("TicketSelection · mejores butacas", () => {
  beforeEach(() => zoomToElement.mockClear());

  it("empieza en 2 y elige el bloque más cercano y centrado, lo anuncia y acerca el plano a él", () => {
    renderSelection();
    openNorte();

    expect(within(bestSeatsGroup()).getByText("2").getAttribute("aria-live")).toBe("polite");
    fireEvent.click(pickButton());

    expect(checkedSeatIds()).toEqual(["norte-A-1", "norte-A-2"]);
    expect(screen.getByText("Elegimos 2 asientos juntos en la fila A.").getAttribute("role")).toBe("status");
    expect(removeChip(NORTE_A1)).toBeTruthy();
    expect(seatCounter().textContent).toBe("2 de 10 butacas");
    expect(zoomToElement).toHaveBeenCalledTimes(1);
    expect(zoomToElement).toHaveBeenCalledWith([seatAt("A", 1), seatAt("A", 2)], { maxScale: 2, animationTime: 300 });
  });

  it("con movimiento reducido el zoom a las elegidas es instantáneo", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(prefers-reduced-motion: reduce)" }));
    try {
      renderSelection();
      openNorte();
      fireEvent.click(pickButton());

      expect(zoomToElement).toHaveBeenCalledWith(expect.any(Array), { maxScale: 2, animationTime: 0 });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("con 1 el botón dice 'Elegir la mejor butaca' y elige la butaca más centrada; no baja de 1", () => {
    renderSelection();
    openNorte();
    fireEvent.click(screen.getByRole("button", { name: "Quitar una butaca" }));

    expect(within(bestSeatsGroup()).getByText("1")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Quitar una butaca" }).getAttribute("aria-disabled")).toBe("true");
    expect(pickButton().textContent).toBe("Elegir la mejor butaca");

    fireEvent.click(pickButton());
    expect(checkedSeatIds()).toEqual(["norte-A-2"]);
    expect(screen.getByText("Elegimos Fila A · Asiento 2.")).toBeTruthy();
  });

  it("sustituye las butacas de la zona por el bloque y conserva las demás entradas", () => {
    renderSelection();
    fireEvent.click(zoneCard("VIP"));
    fireEvent.click(add("VIP"));
    fireEvent.click(backButton());
    openNorte();
    fireEvent.click(seatAt("B", 1));

    fireEvent.click(pickButton());

    expect(checkedSeatIds()).toEqual(["norte-A-1", "norte-A-2"]);
    expect(screen.queryByRole("button", { name: `Quitar ${NORTE_B1}` })).toBeNull();
    expect(within(summary()).getByText("1 × VIP")).toBeTruthy();
    expect(within(summary()).getByText("2 × Tribuna Norte")).toBeTruthy();
    expect(seatCounter().textContent).toBe("2 de 9 butacas");
  });

  it("empieza en las butacas ya elegidas en la zona", () => {
    renderSelection();
    openNorte();
    fireEvent.click(seatAt("B", 1));
    fireEvent.click(backButton());
    openNorte();

    expect(within(bestSeatsGroup()).getByText("1")).toBeTruthy();
    expect(pickButton().textContent).toBe("Elegir la mejor butaca");
  });

  it("sin bloque libre de esa cantidad avisa y no cambia nada", () => {
    renderSelection();
    openNorte();
    fireEvent.click(seatAt("B", 1));
    fireEvent.click(screen.getByRole("button", { name: "Agregar una butaca" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar una butaca" }));
    // El stepper conserva su valor (2) al elegir a mano: 2 + 2 = 4, y la fila A solo tiene 2 libres juntas.
    expect(within(bestSeatsGroup()).getByText("4")).toBeTruthy();

    fireEvent.click(pickButton());

    expect(screen.getByText("No hay 4 asientos juntos disponibles en esta zona.").getAttribute("role")).toBe("status");
    expect(checkedSeatIds()).toEqual(["norte-B-1"]);
    expect(zoomToElement).not.toHaveBeenCalled();
  });

  it("con 10 entradas en otras zonas el stepper y el botón quedan deshabilitados pero enfocables", () => {
    renderSelection();
    fireEvent.click(zoneCard("General"));
    for (let i = 0; i < 10; i++) fireEvent.click(add("General"));
    fireEvent.click(backButton());
    openNorte();

    expect(seatCounter().textContent).toBe("0 de 0 butacas");
    for (const button of [
      screen.getByRole("button", { name: "Quitar una butaca" }),
      screen.getByRole("button", { name: "Agregar una butaca" }),
      pickButton(),
    ]) {
      expect(button.getAttribute("aria-disabled")).toBe("true");
      expect((button as HTMLButtonElement).disabled).toBe(false);
    }

    fireEvent.click(pickButton());
    expect(checkedSeatIds()).toEqual([]);
    expect(zoomToElement).not.toHaveBeenCalled();
  });

  it("el '+' no pasa de las butacas que caben en la compra", () => {
    renderSelection();
    fireEvent.click(zoneCard("General"));
    for (let i = 0; i < 7; i++) fireEvent.click(add("General"));
    fireEvent.click(backButton());
    openNorte();

    fireEvent.click(screen.getByRole("button", { name: "Agregar una butaca" }));
    expect(within(bestSeatsGroup()).getByText("3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Agregar una butaca" }).getAttribute("aria-disabled")).toBe("true");
  });
});

describe("TicketSelection · resumen móvil", () => {
  it("'Ver resumen de la compra' abre la hoja 'Tu compra' con las líneas y el total", async () => {
    renderSelection();
    fireEvent.click(zoneCard("General"));
    fireEvent.click(add("General"));
    fireEvent.click(add("General"));

    fireEvent.click(screen.getByRole("button", { name: "Ver resumen de la compra" }));

    const sheet = await screen.findByRole("dialog", { name: "Tu compra" });
    expect(within(sheet).getByText("2 × General")).toBeTruthy();
    expect(within(sheet).getByText("(2 entradas)")).toBeTruthy();
    expect(within(sheet).getAllByText(formatEventPrice(360))).toHaveLength(2); // línea y total
    expect(within(sheet).getByRole("link", { name: "Continuar" }).getAttribute("href")).toBe(
      "/checkout?evento=evento-prueba&general=2",
    );
  });
});
