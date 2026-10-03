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

    it.each([
      [1, ["norte-A-2"], "Elegimos Fila A · Asiento 2."],
      [2, ["norte-A-2", "norte-A-3"], "Elegimos 2 asientos juntos en la fila A."],
      [3, ["norte-B-1", "norte-B-2", "norte-B-3"], "Elegimos 3 asientos juntos en la fila B."],
    ])("pickBestSeats con count %i elige y devuelve el mejor bloque, con su aviso", (count, expected, notice) => {
      const { result } = renderSelection();
      let picked: string[] | null = null;
      act(() => {
        picked = result.current.pickBestSeats("norte", count);
      });

      expect(picked).toEqual(expected);
      expect(result.current.seatIds).toEqual(expected);
      expect(result.current.notice).toBe(notice);
      expect(result.current.ticketCount).toBe(count);
    });

    it("pickBestSeats sustituye las butacas de la zona por el bloque y conserva las de otras zonas", () => {
      const { result } = renderSelection();
      act(() => result.current.toggleSeat("norte-B-1"));
      act(() => result.current.toggleSeat("sur-A-1"));
      act(() => result.current.toggleSeat("norte-B-4"));

      let picked: string[] | null = null;
      act(() => {
        picked = result.current.pickBestSeats("norte", 3);
      });
      expect(picked).toEqual(["norte-B-1", "norte-B-2", "norte-B-3"]);
      expect(result.current.seatIds).toEqual(["sur-A-1", "norte-B-1", "norte-B-2", "norte-B-3"]);
      expect(result.current.ticketCount).toBe(4);

      act(() => {
        picked = result.current.pickBestSeats("norte", 1);
      });
      expect(picked).toEqual(["norte-A-2"]);
      expect(result.current.seatIds).toEqual(["sur-A-1", "norte-A-2"]);
    });

    it("pickBestSeats sin bloque libre de count devuelve null, no cambia la selección y avisa", () => {
      const { result } = renderSelection();
      act(() => result.current.toggleSeat("norte-B-2"));

      let picked: string[] | null = [];
      act(() => {
        picked = result.current.pickBestSeats("norte", 5);
      });
      expect(picked).toBeNull();
      expect(result.current.seatIds).toEqual(["norte-B-2"]);
      expect(result.current.notice).toBe("No hay 5 asientos juntos disponibles en esta zona.");
    });

    it.each([
      ["sur", 1, "No quedan asientos disponibles en esta zona."],
      ["sur", 2, "No hay 2 asientos juntos disponibles en esta zona."],
      ["mesa", 1, "No quedan asientos disponibles en esta zona."],
      ["mesa", 2, "No hay 2 asientos juntos disponibles en esta zona."],
    ])("pickBestSeats en %s (sin disponibles o agotada) con count %i devuelve null y avisa", (zoneId, count, notice) => {
      const { result } = renderSelection();
      let picked: string[] | null = [];
      act(() => {
        picked = result.current.pickBestSeats(zoneId, count);
      });
      expect(picked).toBeNull();
      expect(result.current.seatIds).toEqual([]);
      expect(result.current.notice).toBe(notice);
    });

    it("pickBestSeats nunca elige accesibles", () => {
      const { result } = renderSelection();
      // Sur solo tiene un accesible y un ocupado; en Norte, A-4 (accesible) completaría el bloque A-2…A-4.
      act(() => {
        expect(result.current.pickBestSeats("sur", 1)).toBeNull();
      });
      act(() => {
        expect(result.current.pickBestSeats("norte", 3)).toEqual(["norte-B-1", "norte-B-2", "norte-B-3"]);
      });
      expect(result.current.seatIds).not.toContain("norte-A-4");
      expect(result.current.seatIds).not.toContain("sur-A-1");
    });

    it("pickBestSeats por encima del límite de 10 devuelve null y avisa; descuenta las butacas de la zona", () => {
      const { result } = renderSelection();
      for (let i = 0; i < 8; i++) act(() => result.current.changeQuantity("campo", 1));
      act(() => result.current.toggleSeat("norte-B-4"));

      // 9 − 1 (de la zona) + 3 = 11 > 10.
      let picked: string[] | null = [];
      act(() => {
        picked = result.current.pickBestSeats("norte", 3);
      });
      expect(picked).toBeNull();
      expect(result.current.seatIds).toEqual(["norte-B-4"]);
      expect(result.current.notice).toBe("Máximo 10 entradas por compra");

      // 9 − 1 + 2 = 10: cabe.
      act(() => {
        picked = result.current.pickBestSeats("norte", 2);
      });
      expect(picked).toEqual(["norte-A-2", "norte-A-3"]);
      expect(result.current.ticketCount).toBe(10);
    });

    it.each([
      ["norte", 0],
      ["norte", -1],
      ["norte", 1.5],
      ["norte", Number.NaN],
      ["campo", 1],
      ["inexistente", 1],
    ])("pickBestSeats en %s con count %d devuelve null sin cambios", (zoneId, count) => {
      const { result } = renderSelection();
      act(() => result.current.toggleSeat("norte-B-1"));

      let picked: string[] | null = [];
      act(() => {
        picked = result.current.pickBestSeats(zoneId, count);
      });
      expect(picked).toBeNull();
      expect(result.current.seatIds).toEqual(["norte-B-1"]);
      expect(result.current.notice).toBeNull();
    });

    it("el aviso se limpia con la siguiente acción que cambia la selección", () => {
      const { result } = renderSelection();
      act(() => {
        result.current.pickBestSeats("sur", 1);
      });
      expect(result.current.notice).not.toBeNull();

      act(() => result.current.removeSeat("norte-B-1"));
      expect(result.current.notice).not.toBeNull();

      act(() => result.current.changeQuantity("campo", 1));
      expect(result.current.notice).toBeNull();

      act(() => {
        result.current.pickBestSeats("norte", 1);
      });
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
