import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { GeneralVenueZone, VenueMap } from "../types/seating.types";
import { useSeatSelection } from "./useSeatSelection";

function generalZone(id: string, name: string, price: number, status: GeneralVenueZone["status"]): GeneralVenueZone {
  return {
    kind: "general",
    id,
    ticketTypeId: `${id}-pass`,
    path: "M20 80 H580 V160 H20 Z",
    labelPos: { x: 300, y: 120 },
    capacity: 500,
    name,
    price,
    status,
  };
}

const map: VenueMap = {
  eventSlug: "evento-prueba",
  venue: "Recinto de prueba",
  viewBox: "0 0 600 520",
  stage: { label: "ESCENARIO", path: "M200 16 H400 V60 H200 Z", labelPos: { x: 300, y: 46 } },
  zones: [
    generalZone("vip", "VIP", 550, "low-stock"),
    {
      kind: "numbered",
      id: "norte",
      ticketTypeId: "tribuna-norte",
      path: "M20 180 H580 V260 H20 Z",
      labelPos: { x: 300, y: 220 },
      seatViewBox: "0 0 112 96",
      rows: [{ label: "A", seats: [{ id: "norte-A-1", row: "A", number: 1, x: 56, y: 48, status: "available" }] }],
      name: "Tribuna Norte",
      price: 220,
      status: "available",
    },
    generalZone("palco", "Palco", 300, "sold-out"),
    generalZone("campo", "Campo", 180, "available"),
  ],
};

function renderSelection() {
  return renderHook(() => useSeatSelection(map));
}

afterEach(() => {
  cleanup();
});

describe("useSeatSelection", () => {
  it("empieza sin zona activa ni entradas", () => {
    const { result } = renderSelection();
    expect(result.current).toMatchObject({
      activeZoneId: null,
      quantities: {},
      seatIds: [],
      ticketCount: 0,
      atLimit: false,
      lines: [],
      total: 0,
      checkoutHref: null,
    });
  });

  it("selectZone activa cualquier zona, incluidas las numeradas y las agotadas", () => {
    const { result } = renderSelection();
    act(() => result.current.selectZone("norte"));
    expect(result.current.activeZoneId).toBe("norte");
    act(() => result.current.selectZone("palco"));
    expect(result.current.activeZoneId).toBe("palco");
  });

  it("changeQuantity activa la zona, sube y baja sin pasar de 0", () => {
    const { result } = renderSelection();
    act(() => result.current.changeQuantity("campo", 1));
    expect(result.current.activeZoneId).toBe("campo");
    act(() => result.current.changeQuantity("campo", 1));
    expect(result.current.quantities.campo).toBe(2);
    expect(result.current.ticketCount).toBe(2);

    act(() => result.current.changeQuantity("campo", -1));
    act(() => result.current.changeQuantity("campo", -1));
    act(() => result.current.changeQuantity("campo", -1));
    expect(result.current.quantities.campo).toBe(0);
    expect(result.current.ticketCount).toBe(0);
    expect(result.current.checkoutHref).toBeNull();
  });

  it.each(["norte", "palco", "inexistente"])("changeQuantity no hace nada en la zona %s", (zoneId) => {
    const { result } = renderSelection();
    act(() => result.current.changeQuantity(zoneId, 1));
    expect(result.current.activeZoneId).toBeNull();
    expect(result.current.quantities).toEqual({});
    expect(result.current.ticketCount).toBe(0);
  });

  it("limita a 10 entradas sumando las zonas; en el límite «+» no hace nada y «−» sí", () => {
    const { result } = renderSelection();
    for (let i = 0; i < 6; i++) act(() => result.current.changeQuantity("campo", 1));
    for (let i = 0; i < 4; i++) act(() => result.current.changeQuantity("vip", 1));
    expect(result.current.ticketCount).toBe(10);
    expect(result.current.atLimit).toBe(true);

    act(() => result.current.changeQuantity("campo", 1));
    expect(result.current.quantities).toEqual({ campo: 6, vip: 4 });
    expect(result.current.activeZoneId).toBe("vip");

    act(() => result.current.changeQuantity("campo", -1));
    expect(result.current.ticketCount).toBe(9);
    expect(result.current.atLimit).toBe(false);
  });

  it("calcula total, líneas en el orden del mapa y checkoutHref con los ticketTypeId", () => {
    const { result } = renderSelection();
    act(() => result.current.changeQuantity("campo", 1));
    act(() => result.current.changeQuantity("campo", 1));
    act(() => result.current.changeQuantity("vip", 1));

    expect(result.current.total).toBe(910);
    expect(result.current.lines).toEqual([
      { zoneId: "vip", name: "VIP", quantity: 1, amount: 550, seatLabels: [] },
      { zoneId: "campo", name: "Campo", quantity: 2, amount: 360, seatLabels: [] },
    ]);
    expect(result.current.checkoutHref).toBe("/checkout?evento=evento-prueba&vip-pass=1&campo-pass=2");
  });
});
