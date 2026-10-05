import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatEventPrice } from "@/modules/events/purchase";

import type { GeneralVenueZone, NumberedVenueZone, VenueMap } from "../types/seating.types";
import { getAnnularSectorPath, type AnnularSector } from "../utils/annularSector";
import { generateArcSeatRows, getRowEdgeLabelPoints } from "../utils/arcSeatRows";
import { SEAT_PLAN_MARGIN } from "../utils/seatRows";
import { PreselectedTicketSelection } from "./PreselectedTicketSelection";
import { TicketSelection } from "./TicketSelection";

const { zoomToElement, searchParams } = vi.hoisted(() => ({
  zoomToElement: vi.fn(() => Promise.resolve()),
  searchParams: { current: "" },
}));

// La URL de `PreselectedTicketSelection` (requisito 35); cada test fija `searchParams.current`.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams(searchParams.current),
}));

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

// Stub de `StartCheckoutButton`: mismo marcado (formulario con el input "selection") sin la acción de servidor.
vi.mock("@/modules/checkout/start", () => ({
  StartCheckoutButton: ({
    checkoutHref,
    className,
    children,
  }: {
    checkoutHref: string | null;
    className?: string;
    children: ReactNode;
  }) =>
    checkoutHref === null ? (
      <button type="button" disabled className={className}>
        {children}
      </button>
    ) : (
      <form>
        <input type="hidden" name="selection" value={checkoutHref} />
        <button type="submit" className={className}>
          {children}
        </button>
      </form>
    ),
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

/** El mapa es una ilustración (`role="img"`), sin controles dentro (decisión 38). */
const mapImage = () => screen.queryByRole("img", { name: "Mapa de zonas de Recinto de prueba" });
const mapShape = (id: string) => mapImage()!.querySelector<SVGPathElement>(`path[data-zone-id="${id}"]`)!;
const mapLabelLayer = () => mapImage()!.parentElement!.querySelector<HTMLElement>(':scope > div[aria-hidden="true"]')!;
const mapLabel = (name: string) => within(mapLabelLayer()).getByText(name).closest("div")!;
const highlightStroke = () => mapImage()!.querySelector('path[aria-hidden="true"].stroke-brand-navy');
const zoneCardList = () => screen.queryByRole("list", { name: "Zonas" });
/** La tarjeta no es un botón: es un grupo nombrado por el nombre visible de la zona. */
const zoneCard = (name: string) => within(zoneCardList()!).getByRole("group", { name });
const highlightedCards = () => zoneCardList()!.querySelectorAll('[data-highlighted="true"]');
const stepper = (name: string) => screen.getByRole("group", { name: `Cantidad de ${name}` });
const stepperValue = (name: string) => stepper(name).querySelector("[aria-live]")!.textContent;
const seatsButton = (name: string) => screen.getByRole("button", { name: new RegExp(`^(Elegir|Cambiar) butacas de ${name}$`) });
const stepIndicator = () => screen.getByText(/^Paso \d de 2 · /);
const zoneHeading = (name: string) => screen.getByRole("heading", { level: 3, name });
const backButton = () => screen.getByRole("button", { name: "Todas las zonas" });
const addAnotherZone = () => screen.queryByRole("button", { name: "Agregar otra zona" });
const add = (name: string) => screen.getByRole("button", { name: `Agregar una entrada de ${name}` });
const remove = (name: string) => screen.getByRole("button", { name: `Quitar una entrada de ${name}` });
const quantityGroup = () => screen.getByRole("group", { name: "Cantidad" });
const subtotal = () => screen.getByText("Subtotal").parentElement!;
const summary = () => screen.getByRole("complementary", { name: "Resumen de la compra" });
/** "n × <zona>" de cada línea de "Tu compra" (aside), en orden. */
const summaryLines = () =>
  within(summary())
    .queryAllByRole("listitem")
    .map((item) => item.querySelector("span")!.textContent);
const removeLine = (name: string) => within(summary()).getByRole("button", { name: `Quitar ${name} de tu compra` });
const emptySummaryText = "Todavía no elegiste entradas. Empieza eligiendo una zona.";
const continueButtons = () => screen.queryAllByRole("button", { name: "Continuar" }) as HTMLButtonElement[];
// Lo que envía cada "Continuar" habilitado a `startCheckout` (input "selection" de su formulario).
const selectionOf = (button: HTMLElement) =>
  ((button as HTMLButtonElement).form?.elements.namedItem("selection") as HTMLInputElement | null)?.value;
const continueSelections = () => continueButtons().filter((button) => !button.disabled).map(selectionOf);
/** Los dos "Continuar" (aside y barra móvil) habilitados y enviando la misma selección. */
const expectCheckoutSelection = (selection: string) => {
  expect(continueButtons()).toHaveLength(2);
  expect(continueSelections()).toEqual([selection, selection]);
};
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
const NORTE_BAND_Y = MAP.zones[2].labelPos.y;
const NORTE_A1 = "Tribuna Norte · Fila A · Asiento 1";
const NORTE_B1 = "Tribuna Norte · Fila B · Asiento 1";

/** "Elegir butacas de Tribuna Norte" (o "Cambiar butacas…"): abre su plano. */
function openNorte() {
  fireEvent.click(seatsButton("Tribuna Norte"));
}

function clickTimes(button: () => HTMLElement, times: number) {
  for (let i = 0; i < times; i++) fireEvent.click(button());
}

afterEach(cleanup);

describe("TicketSelection · sub-paso 1", () => {
  it("muestra una sola tarjeta 'Elige tus entradas' con 'Paso 1 de 2 · Elige tus zonas', el mapa y las tarjetas", () => {
    renderSelection();

    expect(screen.getByRole("region", { name: "Elige tus entradas" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Elige tus entradas",
      "Tu compra",
    ]);
    expect(stepIndicator().textContent).toBe("Paso 1 de 2 · Elige tus zonas");
    expect(stepIndicator().getAttribute("aria-live")).toBe("polite");
    expect(mapImage()).toBeTruthy();
    expect(within(zoneCardList()!).getAllByRole("listitem")).toHaveLength(4);
    for (const zone of MAP.zones) expect(zoneCard(zone.name)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Todas las zonas" })).toBeNull();
    // Primer render sin animación.
    expect(animatedStep("zoom-in")).toBeNull();
  });

  it("encima de las tarjetas avisa que se pueden combinar zonas, solo con 2 o más zonas comprables", () => {
    renderSelection();
    const help = screen.getByText("Puedes combinar varias zonas en una misma compra.");
    expect(help.compareDocumentPosition(zoneCardList()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    cleanup();

    // VIP y Mesa (agotada): una sola zona comprable.
    render(<TicketSelection map={{ ...MAP, zones: [MAP.zones[0], MAP.zones[3]] }} />);
    expect(screen.queryByText("Puedes combinar varias zonas en una misma compra.")).toBeNull();
    expect(stepIndicator().textContent).toBe("Paso 1 de 2 · Elige tus zonas");
  });

  it("el mapa es una imagen sin controles: ningún descendiente con rol, tabindex, aria-label ni aria-disabled", () => {
    renderSelection();

    const map = mapImage()!;
    expect(map.tagName.toLowerCase()).toBe("svg");
    expect(map.querySelectorAll("[role], [tabindex], [aria-label], [aria-disabled]")).toHaveLength(0);
    const shapes = map.querySelectorAll("path[data-zone-id]");
    expect([...shapes].map((shape) => shape.getAttribute("data-zone-id"))).toEqual(MAP.zones.map((zone) => zone.id));
    for (const shape of shapes) {
      expect(shape.getAttribute("class")).not.toMatch(/cursor-|focus-visible:|pointer-events-none/);
    }
    // La agotada sigue en gris en el mapa.
    expect(mapShape("mesa").getAttribute("class")).toContain("fill-secondary");
  });

  it("cada tarjeta lleva su control: stepper en las de pie, 'Elegir butacas' en la numerada y nada en la agotada", () => {
    renderSelection();

    for (const name of ["VIP", "General"]) {
      expect(within(zoneCard(name)).getByRole("group", { name: `Cantidad de ${name}` })).toBe(stepper(name));
      expect(stepperValue(name)).toBe("0");
      expect(remove(name).getAttribute("aria-disabled")).toBe("true");
      expect(add(name).getAttribute("aria-disabled")).not.toBe("true");
    }

    const norteButton = within(zoneCard("Tribuna Norte")).getByRole("button");
    expect(norteButton).toBe(seatsButton("Tribuna Norte"));
    expect(norteButton.getAttribute("aria-label")).toBe("Elegir butacas de Tribuna Norte");
    expect(norteButton.textContent).toBe("Elegir butacas");

    expect(within(zoneCard("Mesa")).queryAllByRole("button")).toHaveLength(0);
    expect(within(zoneCard("Mesa")).getByText("Agotado")).toBeTruthy();
    expect(within(zoneCard("Mesa")).queryByText("c/u", { exact: false })).toBeNull();
    expect(zoneCard("Mesa").getAttribute("aria-disabled")).toBeNull();
  });

  it("las tarjetas se nombran por su nombre visible y muestran tipo, precio y estado; no son botones", () => {
    renderSelection();

    const vip = zoneCard("VIP");
    expect(vip.getAttribute("aria-label")).toBeNull();
    expect(vip.getAttribute("tabindex")).toBe("-1");
    expect(within(vip).getByText("Últimas entradas")).toBeTruthy();
    expect(within(vip).getByText("General · sin butaca")).toBeTruthy();
    expect(within(vip).getByText(formatEventPrice(550))).toBeTruthy();
    expect(within(zoneCard("Tribuna Norte")).getByText("Numerada · elige tu butaca")).toBeTruthy();

    // Ningún botón ni enlace junta el nombre y el precio de una zona.
    for (const zone of MAP.zones) {
      expect(screen.queryByRole("button", { name: new RegExp(`^${zone.name},`) })).toBeNull();
      expect(screen.queryByRole("link", { name: new RegExp(`^${zone.name},`) })).toBeNull();
    }
  });

  it("el primer control de la tarjeta 'Elige tus entradas' es el primero de la primera tarjeta de zona", () => {
    renderSelection();

    const region = screen.getByRole("region", { name: "Elige tus entradas" });
    const firstControl = region.querySelector('button, a[href], [tabindex="0"]');
    expect(firstControl).toBe(remove("VIP"));
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

    expect(within(summary()).getByText(emptySummaryText)).toBeTruthy();
    expect(continueSelections()).toHaveLength(0);
    expect(continueButtons()).toHaveLength(2);
    for (const button of continueButtons()) expect(button.disabled).toBe(true);
  });
});

describe("TicketSelection · mapa sin efecto", () => {
  it.each(["vip", "mesa"])("clic, Enter, Espacio y el puntero sobre la forma '%s' no hacen nada", (zoneId) => {
    renderSelection();
    const shape = mapShape(zoneId);

    fireEvent.click(shape);
    fireEvent.keyDown(shape, { key: "Enter" });
    fireEvent.keyDown(shape, { key: " " });
    fireEvent.pointerEnter(shape);

    expect(stepIndicator().textContent).toBe("Paso 1 de 2 · Elige tus zonas");
    expect(screen.queryByRole("button", { name: "Todas las zonas" })).toBeNull();
    expect(highlightStroke()).toBeNull();
    expect(highlightedCards()).toHaveLength(0);
    expect(within(summary()).getByText(emptySummaryText)).toBeTruthy();
    expect(stepperValue("VIP")).toBe("0");
  });
});

describe("TicketSelection · resaltado desde la tarjeta", () => {
  it("el puntero sobre una tarjeta delinea su zona en el mapa y atenúa las demás; al salir se quita", () => {
    renderSelection();
    fireEvent.pointerEnter(zoneCard("General"));

    expect(highlightStroke()?.getAttribute("d")).toBe(MAP.zones[1].path);
    expect(zoneCard("General").getAttribute("data-highlighted")).toBe("true");
    expect(mapShape("general").getAttribute("class")).not.toContain("opacity-40");
    for (const [id, name] of [
      ["vip", "VIP"],
      ["norte", "Tribuna Norte"],
      ["mesa", "Mesa"],
    ]) {
      expect(mapShape(id).getAttribute("class")).toContain("opacity-40");
      expect(mapLabel(name).className).toContain("opacity-40");
    }

    fireEvent.pointerLeave(zoneCard("General"));
    expect(highlightStroke()).toBeNull();
    expect(zoneCard("General").getAttribute("data-highlighted")).toBe("false");
    expect(mapShape("vip").getAttribute("class")).not.toContain("opacity-40");
  });

  it("el foco en un control de la tarjeta la resalta; pasar de '−' a '+' lo mantiene y salir de la tarjeta lo quita", () => {
    renderSelection();

    act(() => add("General").focus());
    expect(highlightStroke()?.getAttribute("d")).toBe(MAP.zones[1].path);
    expect(zoneCard("General").getAttribute("data-highlighted")).toBe("true");

    fireEvent.blur(add("General"), { relatedTarget: remove("General") });
    fireEvent.focus(remove("General"));
    expect(zoneCard("General").getAttribute("data-highlighted")).toBe("true");

    fireEvent.blur(remove("General"), { relatedTarget: add("VIP") });
    fireEvent.focus(add("VIP"));
    expect(zoneCard("General").getAttribute("data-highlighted")).toBe("false");
    expect(zoneCard("VIP").getAttribute("data-highlighted")).toBe("true");

    fireEvent.blur(add("VIP"), { relatedTarget: document.body });
    expect(highlightStroke()).toBeNull();
    expect(highlightedCards()).toHaveLength(0);
  });

  it("el botón 'Elegir butacas' también resalta su tarjeta", () => {
    renderSelection();

    act(() => seatsButton("Tribuna Norte").focus());
    expect(highlightStroke()?.getAttribute("d")).toBe(MAP.zones[2].path);
    expect(zoneCard("Tribuna Norte").getAttribute("data-highlighted")).toBe("true");
  });

  it("una zona agotada no se resalta", () => {
    renderSelection();

    fireEvent.pointerEnter(zoneCard("Mesa"));
    fireEvent.focus(zoneCard("Mesa"));

    expect(highlightStroke()).toBeNull();
    expect(zoneCard("Mesa").getAttribute("data-highlighted")).toBe("false");
    expect(mapShape("vip").getAttribute("class")).not.toContain("opacity-40");
  });
});

describe("TicketSelection · stepper en la tarjeta", () => {
  it("'+' suma en el sub-paso 1: stepper, insignia del mapa, 'Tu compra' y 'Continuar'; '−' resta", () => {
    renderSelection();
    clickTimes(() => add("VIP"), 2);

    expect(stepIndicator().textContent).toBe("Paso 1 de 2 · Elige tus zonas");
    expect(mapImage()).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Todas las zonas" })).toBeNull();
    expect(stepperValue("VIP")).toBe("2");
    expect(stepperValue("General")).toBe("0");
    expect(remove("VIP").getAttribute("aria-disabled")).not.toBe("true");
    expect(within(mapLabel("VIP")).getByText("2")).toBeTruthy();
    // Las de pie no repiten la cantidad en texto: ya está en el stepper.
    expect(within(zoneCard("VIP")).queryByText(/elegidas?$/)).toBeNull();

    const aside = within(summary());
    expect(summaryLines()).toEqual(["2 × VIP"]);
    expect(aside.getByText("(2 entradas)")).toBeTruthy();
    expect(aside.getAllByText(formatEventPrice(1100))).toHaveLength(2); // línea y total
    expect(screen.getByText("Total · 2 entradas")).toBeTruthy();
    expectCheckoutSelection("/checkout?evento=evento-prueba&vip=2");

    fireEvent.click(remove("VIP"));
    expect(stepperValue("VIP")).toBe("1");
    expect(screen.getByText("Total · 1 entrada")).toBeTruthy();
    expect(document.activeElement).toBe(document.body);
  });

  it("combina zonas de pie y butacas: 3 líneas en el orden del mapa, total y selección con 'asientos'", () => {
    renderSelection();
    clickTimes(() => add("VIP"), 2);
    clickTimes(() => add("General"), 3);

    openNorte();
    expect(seatCounter().textContent).toBe("0 de 5 butacas");
    fireEvent.click(seatAt("A", 1));
    fireEvent.click(seatAt("B", 1));
    expect(seatCounter().textContent).toBe("2 de 5 butacas");
    fireEvent.click(addAnotherZone()!);

    expect(stepperValue("VIP")).toBe("2");
    expect(stepperValue("General")).toBe("3");
    for (const [name, count] of [
      ["VIP", "2"],
      ["General", "3"],
      ["Tribuna Norte", "2"],
    ]) {
      expect(within(mapLabel(name)).getByText(count)).toBeTruthy();
    }
    expect(summaryLines()).toEqual(["2 × VIP", "3 × General", "2 × Tribuna Norte"]);
    const aside = within(summary());
    expect(aside.getByText("Fila A · Asiento 1, Fila B · Asiento 1")).toBeTruthy();
    expect(aside.getByText("(7 entradas)")).toBeTruthy();
    expect(aside.getByText(formatEventPrice(2080))).toBeTruthy();
    expect(screen.getByText("Total · 7 entradas")).toBeTruthy();
    expectCheckoutSelection("/checkout?evento=evento-prueba&vip=2&general=3&norte=2&asientos=norte-A-1%2Cnorte-B-1");
  });
});

describe("TicketSelection · límite de 10 combinado", () => {
  it("con 10 entre VIP y General todos los '+' quedan deshabilitados pero enfocables y el pie avisa", () => {
    renderSelection();
    expect(screen.getByRole("status").textContent).toBe("Máximo 10 entradas por compra.");

    clickTimes(() => add("VIP"), 4);
    clickTimes(() => add("General"), 7);

    expect(stepperValue("VIP")).toBe("4");
    expect(stepperValue("General")).toBe("6");
    for (const name of ["VIP", "General"]) {
      expect(add(name).getAttribute("aria-disabled")).toBe("true");
      expect((add(name) as HTMLButtonElement).disabled).toBe(false);
    }
    expect(screen.getByRole("status").textContent).toBe("Llegaste al máximo de 10 entradas por compra.");
    expect(within(summary()).getByText("(10 entradas)")).toBeTruthy();

    // "Elegir butacas" sigue habilitado en el límite.
    expect(seatsButton("Tribuna Norte").getAttribute("aria-disabled")).not.toBe("true");
    openNorte();
    expect(stepIndicator().textContent).toBe("Paso 2 de 2 · Elige tus butacas");
    expect(seatCounter().textContent).toBe("0 de 0 butacas");
  });

  it("con butacas: la que pasa de 10 no se elige; al volver avisa en el pie y 'Quitar' libera los '+'", () => {
    renderSelection();
    clickTimes(() => add("VIP"), 4);
    clickTimes(() => add("General"), 4);

    openNorte();
    expect(seatCounter().textContent).toBe("0 de 2 butacas");
    fireEvent.click(seatAt("A", 1));
    fireEvent.click(seatAt("A", 2));
    expect(seatCounter().textContent).toBe("2 de 2 butacas");
    fireEvent.click(seatAt("B", 1));
    expect(seatAt("B", 1).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("Máximo 10 entradas por compra")).toBeTruthy();

    fireEvent.click(addAnotherZone()!);
    for (const name of ["VIP", "General"]) expect(add(name).getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("status").textContent).toBe("Llegaste al máximo de 10 entradas por compra.");
    expect(seatsButton("Tribuna Norte").getAttribute("aria-label")).toBe("Cambiar butacas de Tribuna Norte");
    expect(seatsButton("Tribuna Norte").getAttribute("aria-disabled")).not.toBe("true");

    fireEvent.click(removeLine("VIP"));
    for (const name of ["VIP", "General"]) expect(add(name).getAttribute("aria-disabled")).not.toBe("true");
    expect(screen.getByRole("status").textContent).toBe("Máximo 10 entradas por compra.");
  });
});

describe("TicketSelection · 'Quitar' en 'Tu compra'", () => {
  it("quitar una línea borra la zona y lleva el foco al 'Quitar' de la siguiente, o de la anterior", () => {
    renderSelection();
    clickTimes(() => add("VIP"), 2);
    clickTimes(() => add("General"), 3);
    expect(removeLine("VIP").getAttribute("aria-label")).toBe("Quitar VIP de tu compra");

    fireEvent.click(removeLine("VIP"));
    expect(summaryLines()).toEqual(["3 × General"]);
    expect(stepperValue("VIP")).toBe("0");
    expect(within(mapLabel("VIP")).queryByText("2")).toBeNull();
    expect(document.activeElement).toBe(removeLine("General"));
    expectCheckoutSelection("/checkout?evento=evento-prueba&general=3");

    fireEvent.click(add("VIP"));
    fireEvent.click(removeLine("General"));
    expect(summaryLines()).toEqual(["1 × VIP"]);
    expect(document.activeElement).toBe(removeLine("VIP"));
  });

  it("quitar la última línea lleva el foco al texto vacío y deshabilita 'Continuar'", () => {
    renderSelection();
    fireEvent.click(add("General"));

    fireEvent.click(removeLine("General"));

    const empty = within(summary()).getByText(emptySummaryText);
    expect(document.activeElement).toBe(empty);
    expect(empty.getAttribute("tabindex")).toBe("-1");
    expect(continueSelections()).toHaveLength(0);
    for (const button of continueButtons()) expect(button.disabled).toBe(true);
  });

  it("quitar Tribuna Norte desmarca sus butacas, también con su plano abierto, y su tarjeta vuelve a 'Elegir butacas'", () => {
    renderSelection();
    fireEvent.click(add("VIP"));
    openNorte();
    fireEvent.click(seatAt("A", 1));
    fireEvent.click(seatAt("B", 1));
    expect(addAnotherZone()).toBeTruthy();

    fireEvent.click(removeLine("Tribuna Norte"));

    expect(checkedSeatIds()).toEqual([]);
    expect(seatCounter().textContent).toBe("0 de 9 butacas");
    expect(screen.getByText("Aún no elegiste asientos.")).toBeTruthy();
    expect(addAnotherZone()).toBeNull();
    expect(summaryLines()).toEqual(["1 × VIP"]);
    expect(document.activeElement).toBe(removeLine("VIP"));

    fireEvent.click(backButton());
    expect(within(zoneCard("Tribuna Norte")).queryByText(/butacas? elegidas?$/)).toBeNull();
    expect(seatsButton("Tribuna Norte").getAttribute("aria-label")).toBe("Elegir butacas de Tribuna Norte");
  });
});

describe("TicketSelection · zona agotada", () => {
  it("la tarjeta Mesa no tiene controles ni recibe nada al pulsarla, y su forma no reacciona", () => {
    renderSelection();

    expect(within(zoneCard("Mesa")).queryAllByRole("button")).toHaveLength(0);
    expect(within(zoneCard("Mesa")).queryByRole("group")).toBeNull();
    fireEvent.click(zoneCard("Mesa"));
    fireEvent.click(mapShape("mesa"));

    expect(stepIndicator().textContent).toBe("Paso 1 de 2 · Elige tus zonas");
    expect(mapImage()).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Todas las zonas" })).toBeNull();
  });
});

describe("TicketSelection · zona numerada", () => {
  it("'Elegir butacas' abre el plano con el contador 'n de m butacas' y enfoca el h3", () => {
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
    expect(mapImage()).toBeNull();
    expect(zoneCardList()).toBeNull();
    // Sin butacas en la zona no hay "Agregar otra zona": para volver están las migas.
    expect(addAnotherZone()).toBeNull();
  });

  it("el sub-paso 2 entra creciendo desde la etiqueta de la zona", () => {
    renderSelection();
    openNorte();

    const step = animatedStep("zoom-in-95");
    expect(step?.className).toContain("motion-safe:animate-in");
    expect(step?.style.transformOrigin).toBe(`50% ${(NORTE_BAND_Y / 520) * 100}%`);
  });

  it("con butacas aparece 'Agregar otra zona', que vuelve al sub-paso 1 con el foco en la tarjeta resaltada", () => {
    renderSelection();
    openNorte();
    fireEvent.click(seatAt("A", 1));

    const button = addAnotherZone()!;
    expect(button.className).toContain("h-11");
    const footer = button.parentElement!;
    expect(within(footer).getByText("Puedes combinar varias zonas en una misma compra.")).toBeTruthy();

    fireEvent.click(button);

    expect(stepIndicator().textContent).toBe("Paso 1 de 2 · Elige tus zonas");
    expect(document.activeElement).toBe(zoneCard("Tribuna Norte"));
    expect(zoneCard("Tribuna Norte").getAttribute("data-highlighted")).toBe("true");
    expect(highlightStroke()?.getAttribute("d")).toBe(MAP.zones[2].path);
    expect(within(zoneCard("Tribuna Norte")).getByText("1 butaca elegida")).toBeTruthy();
    expect(seatsButton("Tribuna Norte").getAttribute("aria-label")).toBe("Cambiar butacas de Tribuna Norte");
    expect(seatsButton("Tribuna Norte").textContent).toBe("Cambiar butacas");
    expect(within(mapLabel("Tribuna Norte")).getByText("1")).toBeTruthy();

    // Vuelve "alejándose" desde la zona que se cerró.
    const step = animatedStep("zoom-in-105");
    expect(step?.contains(mapImage())).toBe(true);
    expect(step?.style.transformOrigin).toBe(`50% ${(NORTE_BAND_Y / 520) * 100}%`);
  });

  it("'Todas las zonas' también vuelve con el foco en la tarjeta y conserva la selección", () => {
    renderSelection();
    openNorte();
    fireEvent.click(seatAt("B", 1));
    fireEvent.click(backButton());

    expect(stepIndicator().textContent).toBe("Paso 1 de 2 · Elige tus zonas");
    expect(document.activeElement).toBe(zoneCard("Tribuna Norte"));
    expect(summaryLines()).toEqual(["1 × Tribuna Norte"]);
  });

  it("el contador descuenta las entradas de otras zonas y se actualiza al elegir", () => {
    renderSelection();
    clickTimes(() => add("VIP"), 2);
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
    expect(continueSelections()).toHaveLength(0);
    expect(addAnotherZone()).toBeNull();
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
    expect(addAnotherZone()).toBeNull();
  });

  it("volver y sumar entradas de pie conserva los asientos y la selección de 'Continuar' incluye 'asientos'", () => {
    renderSelection();
    openNorte();
    fireEvent.click(seatAt("A", 1));
    fireEvent.click(addAnotherZone()!);
    fireEvent.click(add("General"));

    expect(screen.getByText("Total · 2 entradas")).toBeTruthy();
    expectCheckoutSelection("/checkout?evento=evento-prueba&general=1&norte=1&asientos=norte-A-1");
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
    fireEvent.click(seatsButton("Tribuna Oriente"));
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

  it("desde sm, el minimapa va en la barra si el plano entero llegaría a su esquina, y se recoloca al redimensionar", () => {
    const [, , planWidth, planHeight] = ARC_ZONE.seatViewBox.split(" ").map(Number);
    const minimapSize = { width: 112, height: 80 };
    // Medidas simuladas: el `<svg>` del plano mide `svgSize` y el minimapa `minimapSize`; el resto, 0 (jsdom).
    let svgSize = { width: planWidth * 2, height: planHeight * 2 };
    let resize = () => {};
    const isMinimap = (element: Element) => element.hasAttribute("data-placement");
    const spies = [
      vi.spyOn(Element.prototype, "clientWidth", "get").mockImplementation(function (this: Element) {
        return this instanceof SVGSVGElement ? svgSize.width : 0;
      }),
      vi.spyOn(Element.prototype, "clientHeight", "get").mockImplementation(function (this: Element) {
        return this instanceof SVGSVGElement ? svgSize.height : 0;
      }),
      vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
        return isMinimap(this) ? minimapSize.width : 0;
      }),
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
        return isMinimap(this) ? minimapSize.height : 0;
      }),
    ];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          resize = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    const placement = () => minimap(ARC_MAP)!.parentElement!;
    const expectPlacement = (expected: "bar" | "overlay") => {
      expect(placement().dataset.placement).toBe(expected);
      const overlaid = expected === "overlay";
      expect(placement().className.includes("sm:absolute sm:top-3 sm:left-3 sm:z-10")).toBe(overlaid);
      expect(placement().parentElement!.className.includes("sm:contents")).toBe(overlaid);
    };
    const resizeTo = (size: typeof svgSize) => {
      svgSize = size;
      act(() => resize());
    };

    try {
      openOriente();
      // El plano llena el `<svg>`: su esquina queda bajo el minimapa → a la barra, antes del lienzo. El zoom sigue
      // superpuesto abajo a la derecha.
      expectPlacement("bar");
      expect(placement().nextElementSibling).toBe(zoomGroup());
      expect(zoomGroup().className).toContain("sm:absolute sm:right-3 sm:bottom-3 sm:z-10");

      // Margen lateral justo para el minimapa (12 px + su ancho a cada lado del plano) → superpuesto.
      const sideMargin = 12 + minimapSize.width;
      resizeTo({ width: planWidth * 2 + 2 * sideMargin, height: planHeight * 2 });
      expectPlacement("overlay");

      // Un píxel menos de margen → otra vez a la barra.
      resizeTo({ width: planWidth * 2 + 2 * sideMargin - 2, height: planHeight * 2 });
      expectPlacement("bar");

      // Margen superior suficiente (plano por debajo del minimapa) → superpuesto.
      resizeTo({ width: planWidth * 2, height: planHeight * 2 + 2 * (12 + minimapSize.height) });
      expectPlacement("overlay");
    } finally {
      spies.forEach((spy) => spy.mockRestore());
      vi.unstubAllGlobals();
    }
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
    fireEvent.click(add("VIP"));
    openNorte();
    fireEvent.click(seatAt("B", 1));

    fireEvent.click(pickButton());

    expect(checkedSeatIds()).toEqual(["norte-A-1", "norte-A-2"]);
    expect(screen.queryByRole("button", { name: `Quitar ${NORTE_B1}` })).toBeNull();
    expect(summaryLines()).toEqual(["1 × VIP", "2 × Tribuna Norte"]);
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
    clickTimes(() => add("General"), 10);
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
    clickTimes(() => add("General"), 7);
    openNorte();

    fireEvent.click(screen.getByRole("button", { name: "Agregar una butaca" }));
    expect(within(bestSeatsGroup()).getByText("3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Agregar una butaca" }).getAttribute("aria-disabled")).toBe("true");
  });
});

describe("TicketSelection · resumen móvil", () => {
  async function openSheet() {
    fireEvent.click(screen.getByRole("button", { name: "Ver resumen de la compra" }));
    return screen.findByRole("dialog", { name: "Tu compra" });
  }

  it("'Ver resumen de la compra' abre la hoja 'Tu compra' con las líneas y el total", async () => {
    renderSelection();
    clickTimes(() => add("General"), 2);

    const sheet = await openSheet();
    expect(within(sheet).getByText("2 × General")).toBeTruthy();
    expect(within(sheet).getByText("(2 entradas)")).toBeTruthy();
    expect(within(sheet).getAllByText(formatEventPrice(360))).toHaveLength(2); // línea y total
    expect(selectionOf(within(sheet).getByRole("button", { name: "Continuar" }))).toBe(
      "/checkout?evento=evento-prueba&general=2",
    );
  });

  it("la hoja también tiene 'Quitar' por línea, con el mismo foco", async () => {
    renderSelection();
    fireEvent.click(add("VIP"));
    clickTimes(() => add("General"), 2);

    const sheet = await openSheet();
    fireEvent.click(within(sheet).getByRole("button", { name: "Quitar VIP de tu compra" }));
    expect(within(sheet).queryByText("1 × VIP")).toBeNull();
    expect(document.activeElement).toBe(within(sheet).getByRole("button", { name: "Quitar General de tu compra" }));
    expect(stepperValue("VIP")).toBe("0");

    fireEvent.click(within(sheet).getByRole("button", { name: "Quitar General de tu compra" }));
    expect(document.activeElement).toBe(within(sheet).getByText(emptySummaryText));
    expect(within(sheet).getByRole("button", { name: "Continuar" })).toHaveProperty("disabled", true);
  });
});

describe("TicketSelection · zona de pie abierta con ?zona= (F6)", () => {
  it("abre su panel en 0 sin mover el foco ni 'Agregar otra zona'; con una entrada aparece y vuelve a su tarjeta", () => {
    render(<TicketSelection map={MAP} initialZoneId="vip" />);

    expect(stepIndicator().textContent).toBe("Paso 2 de 2 · Elige la cantidad");
    expect(zoneHeading("VIP")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Ruta de selección" }).textContent).toContain("Todas las zonas");
    expect(screen.getByText(`· ${formatEventPrice(550)} c/u`)).toBeTruthy();
    expect(screen.getByText("General · sin butaca")).toBeTruthy();
    expect(within(quantityGroup()).getByText("0")).toBeTruthy();
    expect(subtotal().textContent).toContain(formatEventPrice(0));
    expect(mapImage()).toBeNull();
    expect(zoneCardList()).toBeNull();
    expect(document.activeElement).toBe(document.body);
    for (const button of continueButtons()) expect(button.disabled).toBe(true);
    expect(addAnotherZone()).toBeNull();

    fireEvent.click(add("VIP"));
    expect(within(quantityGroup()).getByText("1")).toBeTruthy();
    expect(subtotal().textContent).toContain(formatEventPrice(550));
    expect(screen.getByText("Puedes combinar varias zonas en una misma compra.")).toBeTruthy();

    fireEvent.click(addAnotherZone()!);
    expect(stepIndicator().textContent).toBe("Paso 1 de 2 · Elige tus zonas");
    expect(document.activeElement).toBe(zoneCard("VIP"));
    expect(zoneCard("VIP").getAttribute("data-highlighted")).toBe("true");
    expect(stepperValue("VIP")).toBe("1");

    fireEvent.click(add("General"));
    expect(summaryLines()).toEqual(["1 × VIP", "1 × General"]);
  });

  it("el panel sube y baja la cantidad con el subtotal, el total y la selección de 'Continuar'", () => {
    render(<TicketSelection map={MAP} initialZoneId="vip" />);
    expect(remove("VIP").getAttribute("aria-disabled")).toBe("true");

    clickTimes(() => add("VIP"), 2);

    expect(within(quantityGroup()).getByText("2")).toBeTruthy();
    expect(subtotal().textContent).toContain(formatEventPrice(1100));
    expect(summaryLines()).toEqual(["2 × VIP"]);
    expect(within(summary()).getByText("(2 entradas)")).toBeTruthy();
    expect(screen.getByText("Total · 2 entradas")).toBeTruthy();
    expectCheckoutSelection("/checkout?evento=evento-prueba&vip=2");

    fireEvent.click(remove("VIP"));
    expect(within(quantityGroup()).getByText("1")).toBeTruthy();
    expect(subtotal().textContent).toContain(formatEventPrice(550));
  });

  it("'Todas las zonas' vuelve al sub-paso 1 con el foco en la tarjeta y la cantidad en su stepper", () => {
    render(<TicketSelection map={MAP} initialZoneId="vip" />);
    clickTimes(() => add("VIP"), 2);
    fireEvent.click(backButton());

    expect(stepIndicator().textContent).toBe("Paso 1 de 2 · Elige tus zonas");
    expect(document.activeElement).toBe(zoneCard("VIP"));
    expect(stepperValue("VIP")).toBe("2");
    expect(within(mapLabel("VIP")).getByText("2")).toBeTruthy();
  });

  it("al llegar a 10 entradas en total deshabilita '+' y avisa en el pie del panel", () => {
    render(<TicketSelection map={MAP} initialZoneId="general" />);
    expect(screen.getByText("Máximo 10 entradas por compra.").getAttribute("role")).toBe("status");

    clickTimes(() => add("General"), 11);

    expect(within(quantityGroup()).getByText("10")).toBeTruthy();
    expect(add("General").getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("status").textContent).toBe("Llegaste al máximo de 10 entradas por compra.");
    expect(within(summary()).getByText("(10 entradas)")).toBeTruthy();
  });
});

describe("TicketSelection · estado inicial (F6)", () => {
  const PRESELECTION = { quantities: { vip: 2 }, seatIds: ["norte-A-1", "norte-B-1"] };
  const PRESELECTED_HREF = "/checkout?evento=evento-prueba&vip=2&norte=2&asientos=norte-A-1%2Cnorte-B-1";

  function expectPreselection() {
    expect(stepIndicator().textContent).toBe("Paso 1 de 2 · Elige tus zonas");
    expect(stepperValue("VIP")).toBe("2");
    expect(within(zoneCard("Tribuna Norte")).getByText("2 butacas elegidas")).toBeTruthy();
    expect(seatsButton("Tribuna Norte").getAttribute("aria-label")).toBe("Cambiar butacas de Tribuna Norte");
    expect(within(mapLabel("VIP")).getByText("2")).toBeTruthy();
    expect(summaryLines()).toEqual(["2 × VIP", "2 × Tribuna Norte"]);
    const aside = within(summary());
    expect(aside.getByText("(4 entradas)")).toBeTruthy();
    expect(aside.getByText(formatEventPrice(1540))).toBeTruthy(); // total: 1100 + 440
    expect(screen.getByText("Total · 4 entradas")).toBeTruthy();
    expectCheckoutSelection(PRESELECTED_HREF);
  }

  it("con initialSelection abre el sub-paso 1 con las tarjetas, el resumen y 'Continuar' precargados", () => {
    render(<TicketSelection map={MAP} initialSelection={PRESELECTION} />);

    expectPreselection();
    expect(document.activeElement).toBe(document.body);

    openNorte();
    expect(checkedSeatIds()).toEqual(["norte-A-1", "norte-B-1"]);
    expect(seatCounter().textContent).toBe("2 de 8 butacas");
    expect(addAnotherZone()).toBeTruthy();
  });

  it("con initialZoneId de una zona numerada abre su plano con '0 de 10 butacas'", () => {
    render(<TicketSelection map={MAP} initialZoneId="norte" />);

    expect(stepIndicator().textContent).toBe("Paso 2 de 2 · Elige tus butacas");
    expect(zoneHeading("Tribuna Norte")).toBeTruthy();
    expect(seatCounter().textContent).toBe("0 de 10 butacas");
    expect(planGroup()).toBeTruthy();
    expect(mapImage()).toBeNull();
    expect(document.activeElement).toBe(document.body);
  });

  it("con initialZoneId e initialSelection de la misma zona de pie abre su panel con la cantidad precargada", () => {
    render(<TicketSelection map={MAP} initialZoneId="vip" initialSelection={PRESELECTION} />);

    expect(stepIndicator().textContent).toBe("Paso 2 de 2 · Elige la cantidad");
    expect(within(quantityGroup()).getByText("2")).toBeTruthy();
    expect(subtotal().textContent).toContain(formatEventPrice(1100));
    expect(within(summary()).getByText("2 × Tribuna Norte")).toBeTruthy();
    expect(addAnotherZone()).toBeTruthy();
  });
});

describe("PreselectedTicketSelection", () => {
  afterEach(() => {
    searchParams.current = "";
  });

  it("precarga la selección de la URL en el sub-paso 1", () => {
    searchParams.current = "vip=2&norte=2&asientos=norte-A-1%2Cnorte-B-1";
    render(<PreselectedTicketSelection map={MAP} />);

    expect(stepIndicator().textContent).toBe("Paso 1 de 2 · Elige tus zonas");
    expect(stepperValue("VIP")).toBe("2");
    expect(within(zoneCard("Tribuna Norte")).getByText("2 butacas elegidas")).toBeTruthy();
    expectCheckoutSelection("/checkout?evento=evento-prueba&vip=2&norte=2&asientos=norte-A-1%2Cnorte-B-1");
  });

  it("con zona=<de pie> abre su panel, combinable con la precarga", () => {
    searchParams.current = "zona=vip&vip=2";
    render(<PreselectedTicketSelection map={MAP} />);

    expect(stepIndicator().textContent).toBe("Paso 2 de 2 · Elige la cantidad");
    expect(zoneHeading("VIP")).toBeTruthy();
    expect(within(quantityGroup()).getByText("2")).toBeTruthy();
    expect(document.activeElement).toBe(document.body);
  });

  it.each(["zona=mesa", "zona=xx"])("con %s (agotada o inexistente) abre el sub-paso 1", (query) => {
    searchParams.current = query;
    render(<PreselectedTicketSelection map={MAP} />);

    expect(stepIndicator().textContent).toBe("Paso 1 de 2 · Elige tus zonas");
    expect(mapImage()).toBeTruthy();
    expect(zoneCardList()).toBeTruthy();
  });
});
