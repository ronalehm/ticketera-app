import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { GeneralVenueZone, NumberedVenueZone, Seat, VenueMap } from "../types/seating.types";
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

function seat(zoneId: string, row: string, number: number, status: Seat["status"]): Seat {
  return { id: `${zoneId}-${row}-${number}`, row, number, x: 24 + number * 32, y: row === "A" ? 88 : 120, status };
}

function numberedZone(
  id: string,
  name: string,
  price: number,
  status: NumberedVenueZone["status"],
  rows: NumberedVenueZone["rows"],
): NumberedVenueZone {
  return {
    kind: "numbered",
    id,
    ticketTypeId: id === "norte" ? "tribuna-norte" : id,
    path: "M20 180 H580 V260 H20 Z",
    labelPos: { x: 300, y: 220 },
    seatViewBox: "0 0 208 160",
    rows,
    name,
    price,
    status,
  };
}

/**
 * Tribuna Norte: fila A = ocupado, disponible, disponible, accesible (bloque de 2: A-2 y A-3);
 * fila B = 4 disponibles. Sur: solo un accesible y un ocupado (sin disponibles). Mesa: agotada.
 */
const map: VenueMap = {
  eventSlug: "evento-prueba",
  venue: "Recinto de prueba",
  viewBox: "0 0 600 520",
  stage: { label: "ESCENARIO", path: "M200 16 H400 V60 H200 Z", labelPos: { x: 300, y: 46 } },
  zones: [
    generalZone("vip", "VIP", 550, "low-stock"),
    numberedZone("norte", "Tribuna Norte", 220, "available", [
      {
        label: "A",
        seats: [
          seat("norte", "A", 1, "occupied"),
          seat("norte", "A", 2, "available"),
          seat("norte", "A", 3, "available"),
          seat("norte", "A", 4, "accessible"),
        ],
      },
      { label: "B", seats: [1, 2, 3, 4].map((number) => seat("norte", "B", number, "available")) },
    ]),
    generalZone("palco", "Palco", 300, "sold-out"),
    generalZone("campo", "Campo", 180, "available"),
    numberedZone("sur", "Tribuna Sur", 150, "low-stock", [
      { label: "A", seats: [seat("sur", "A", 1, "accessible"), seat("sur", "A", 2, "occupied")] },
    ]),
    // Agotada a propósito con un asiento "available" para comprobar que manda el estado de la zona.
    numberedZone("mesa", "Mesa", 400, "sold-out", [{ label: "A", seats: [seat("mesa", "A", 1, "available")] }]),
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

  it("selectZone activa las zonas numeradas y las de pie", () => {
    const { result } = renderSelection();
    act(() => result.current.selectZone("norte"));
    expect(result.current.activeZoneId).toBe("norte");
    act(() => result.current.selectZone("campo"));
    expect(result.current.activeZoneId).toBe("campo");
  });

  it.each(["palco", "mesa", "inexistente"])("selectZone ignora la zona %s (agotada o inexistente)", (zoneId) => {
    const { result } = renderSelection();
    act(() => result.current.selectZone(zoneId));
    expect(result.current.activeZoneId).toBeNull();

    act(() => result.current.selectZone("norte"));
    act(() => result.current.selectZone(zoneId));
    expect(result.current.activeZoneId).toBe("norte");
  });

  it("closeZone vuelve a no tener zona activa y conserva la selección", () => {
    const { result } = renderSelection();
    act(() => result.current.changeQuantity("campo", 1));
    act(() => result.current.toggleSeat("norte-B-1"));
    act(() => result.current.selectZone("norte"));

    act(() => result.current.closeZone());
    expect(result.current.activeZoneId).toBeNull();
    expect(result.current.quantities).toEqual({ campo: 1 });
    expect(result.current.seatIds).toEqual(["norte-B-1"]);
    expect(result.current.ticketCount).toBe(2);
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

  describe("asientos", () => {
    it("toggleSeat añade y quita asientos disponibles y accesibles, en orden de selección", () => {
      const { result } = renderSelection();
      act(() => result.current.toggleSeat("norte-B-2"));
      act(() => result.current.toggleSeat("norte-A-4"));
      expect(result.current.seatIds).toEqual(["norte-B-2", "norte-A-4"]);
      expect(result.current.ticketCount).toBe(2);

      act(() => result.current.toggleSeat("norte-B-2"));
      expect(result.current.seatIds).toEqual(["norte-A-4"]);
      expect(result.current.notice).toBeNull();
    });

    it.each([
      ["ocupado", "norte-A-1"],
      ["de una zona agotada", "mesa-A-1"],
      ["inexistente", "norte-Z-9"],
      ["con formato inválido", "campo"],
    ])("toggleSeat no cambia nada con un asiento %s", (_, seatId) => {
      const { result } = renderSelection();
      act(() => result.current.toggleSeat(seatId));
      expect(result.current.seatIds).toEqual([]);
      expect(result.current.ticketCount).toBe(0);
      expect(result.current.notice).toBeNull();
    });

    it("removeSeat quita solo ese asiento y no hace nada si no estaba elegido", () => {
      const { result } = renderSelection();
      act(() => result.current.toggleSeat("norte-B-1"));
      act(() => result.current.toggleSeat("sur-A-1"));

      act(() => result.current.removeSeat("norte-B-1"));
      expect(result.current.seatIds).toEqual(["sur-A-1"]);
      act(() => result.current.removeSeat("norte-B-1"));
      expect(result.current.seatIds).toEqual(["sur-A-1"]);
    });

    it("el límite de 10 suma entradas de pie y asientos; en el límite toggleSeat avisa y no añade", () => {
      const { result } = renderSelection();
      for (let i = 0; i < 9; i++) act(() => result.current.changeQuantity("campo", 1));
      act(() => result.current.toggleSeat("norte-B-1"));
      expect(result.current.ticketCount).toBe(10);
      expect(result.current.atLimit).toBe(true);

      act(() => result.current.changeQuantity("vip", 1));
      expect(result.current.quantities).toEqual({ campo: 9 });

      act(() => result.current.toggleSeat("norte-B-2"));
      expect(result.current.seatIds).toEqual(["norte-B-1"]);
      expect(result.current.notice).toBe("Máximo 10 entradas por compra");

      // Activar una zona no cambia la selección: el aviso sigue.
      act(() => result.current.selectZone("norte"));
      expect(result.current.notice).toBe("Máximo 10 entradas por compra");

      // Quitar un asiento en el límite sí funciona y limpia el aviso.
      act(() => result.current.toggleSeat("norte-B-1"));
      expect(result.current.seatIds).toEqual([]);
      expect(result.current.notice).toBeNull();
    });

    it("pickBestSeats sin asientos de la zona elige 1, el más cercano y centrado", () => {
      const { result } = renderSelection();
      act(() => result.current.pickBestSeats("norte"));
      expect(result.current.seatIds).toEqual(["norte-A-2"]);
      expect(result.current.notice).toBe("Elegimos Fila A · Asiento 2.");
    });

    it("pickBestSeats reemplaza los k asientos de la zona por el mejor bloque y conserva los de otras zonas", () => {
      const { result } = renderSelection();
      act(() => result.current.toggleSeat("norte-B-1"));
      act(() => result.current.toggleSeat("sur-A-1"));
      act(() => result.current.toggleSeat("norte-B-4"));

      act(() => result.current.pickBestSeats("norte"));
      expect(result.current.seatIds).toEqual(["sur-A-1", "norte-A-2", "norte-A-3"]);
      expect(result.current.notice).toBe("Elegimos 2 asientos juntos en la fila A.");
      expect(result.current.ticketCount).toBe(3);
    });

    it("pickBestSeats en el límite reemplaza si ya hay asientos de la zona, y si no hay, avisa", () => {
      const { result } = renderSelection();
      for (let i = 0; i < 9; i++) act(() => result.current.changeQuantity("campo", 1));
      act(() => result.current.toggleSeat("norte-B-4"));

      act(() => result.current.pickBestSeats("norte"));
      expect(result.current.seatIds).toEqual(["norte-A-2"]);
      expect(result.current.ticketCount).toBe(10);

      act(() => result.current.pickBestSeats("sur"));
      expect(result.current.seatIds).toEqual(["norte-A-2"]);
      expect(result.current.notice).toBe("Máximo 10 entradas por compra");
    });

    it("pickBestSeats sin bloque posible no cambia la selección y avisa con k asientos", () => {
      const { result } = renderSelection();
      for (const seatId of ["norte-A-2", "norte-A-3", "norte-A-4", "norte-B-1", "norte-B-2"]) {
        act(() => result.current.toggleSeat(seatId));
      }

      act(() => result.current.pickBestSeats("norte"));
      expect(result.current.seatIds).toEqual(["norte-A-2", "norte-A-3", "norte-A-4", "norte-B-1", "norte-B-2"]);
      expect(result.current.notice).toBe("No hay 5 asientos juntos disponibles en esta zona.");
    });

    it.each(["sur", "mesa"])("pickBestSeats sin asientos disponibles en %s avisa que no quedan", (zoneId) => {
      const { result } = renderSelection();
      act(() => result.current.pickBestSeats(zoneId));
      expect(result.current.seatIds).toEqual([]);
      expect(result.current.notice).toBe("No quedan asientos disponibles en esta zona.");
    });

    it.each(["campo", "inexistente"])("pickBestSeats no hace nada en la zona %s", (zoneId) => {
      const { result } = renderSelection();
      act(() => result.current.pickBestSeats(zoneId));
      expect(result.current.seatIds).toEqual([]);
      expect(result.current.notice).toBeNull();
    });

    it("el aviso se limpia con la siguiente acción que cambia la selección", () => {
      const { result } = renderSelection();
      act(() => result.current.pickBestSeats("sur"));
      expect(result.current.notice).not.toBeNull();

      act(() => result.current.removeSeat("norte-B-1"));
      expect(result.current.notice).not.toBeNull();

      act(() => result.current.changeQuantity("campo", 1));
      expect(result.current.notice).toBeNull();

      act(() => result.current.pickBestSeats("norte"));
      expect(result.current.notice).toBe("Elegimos Fila A · Asiento 2.");
      act(() => result.current.removeSeat("norte-A-2"));
      expect(result.current.notice).toBeNull();
    });

    it("líneas, total y checkoutHref incluyen los asientos con `asientos`", () => {
      const { result } = renderSelection();
      act(() => result.current.changeQuantity("campo", 1));
      act(() => result.current.toggleSeat("norte-B-3"));
      act(() => result.current.toggleSeat("norte-A-2"));

      expect(result.current.lines).toEqual([
        {
          zoneId: "norte",
          name: "Tribuna Norte",
          quantity: 2,
          amount: 440,
          seatLabels: ["Fila B · Asiento 3", "Fila A · Asiento 2"],
        },
        { zoneId: "campo", name: "Campo", quantity: 1, amount: 180, seatLabels: [] },
      ]);
      expect(result.current.total).toBe(620);
      expect(result.current.checkoutHref).toBe(
        "/checkout?evento=evento-prueba&tribuna-norte=2&campo-pass=1&asientos=norte-B-3%2Cnorte-A-2",
      );
    });
  });
});
