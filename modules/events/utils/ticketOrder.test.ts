import { describe, expect, it } from "vitest";
import { MAX_TICKETS_PER_ORDER, buildCheckoutHref, getOrderTotal, getTicketCount } from "./ticketOrder";

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
