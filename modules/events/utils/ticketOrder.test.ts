import { describe, expect, it } from "vitest";
import {
  MAX_TICKETS_PER_ORDER,
  buildCheckoutHref,
  getOrderTotal,
  getTicketCount,
  parsePreselectedQuantities,
} from "./ticketOrder";

const ticketTypes = [
  { id: "general", price: 80 },
  { id: "vip", price: 250.5 },
];

describe("ticketOrder", () => {
  it("el máximo por pedido es 10", () => {
    expect(MAX_TICKETS_PER_ORDER).toBe(10);
  });

  it("getOrderTotal suma precio × cantidad de cada tipo", () => {
    expect(getOrderTotal(ticketTypes, { general: 2, vip: 1 })).toBe(410.5);
  });

  it("getOrderTotal devuelve 0 sin cantidades", () => {
    expect(getOrderTotal(ticketTypes, {})).toBe(0);
    expect(getOrderTotal(ticketTypes, { general: 0 })).toBe(0);
  });

  it("getTicketCount suma todas las cantidades", () => {
    expect(getTicketCount({ general: 3, vip: 2, preferencial: 0 })).toBe(5);
    expect(getTicketCount({})).toBe(0);
  });

  it("buildCheckoutHref omite cantidades 0", () => {
    expect(buildCheckoutHref("mi-evento", { general: 2, vip: 0 })).toBe("/checkout?evento=mi-evento&general=2");
  });

  it("buildCheckoutHref codifica los valores", () => {
    expect(buildCheckoutHref("año & más", { "zona a": 1 })).toBe("/checkout?evento=a%C3%B1o+%26+m%C3%A1s&zona+a=1");
  });
});

describe("parsePreselectedQuantities", () => {
  const types = [
    { id: "general", status: "available" as const },
    { id: "vip", status: "low-stock" as const },
    { id: "palco", status: "sold-out" as const },
  ];
  const parse = (query: string) => parsePreselectedQuantities(types, new URLSearchParams(query));

  it("lee la cantidad de cada tipo", () => {
    expect(parse("general=2&vip=1")).toEqual({ general: 2, vip: 1 });
  });

  it("ignora los parámetros desconocidos", () => {
    expect(parse("evento=mi-evento&general=2&asientos=a1%2Ca2&foo=3")).toEqual({ general: 2 });
  });

  it.each(["abc", "0", "11", "1.5", "-1", ""])("ignora el valor inválido %j", (value) => {
    expect(parse(`general=${value}&vip=1`)).toEqual({ vip: 1 });
  });

  it("ignora un parámetro repetido", () => {
    expect(parse("general=1&general=2&vip=1")).toEqual({ vip: 1 });
  });

  it("ignora los tipos agotados", () => {
    expect(parse("palco=2&general=1")).toEqual({ general: 1 });
  });

  it("recorta el total a 10 en el orden de los tipos", () => {
    expect(parse("general=8&vip=5")).toEqual({ general: 8, vip: 2 });
    expect(parse("vip=5&general=10")).toEqual({ general: 10 });
  });

  it("sin parámetros devuelve un objeto vacío", () => {
    expect(parse("")).toEqual({});
  });
});
