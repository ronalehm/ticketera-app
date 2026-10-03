import { describe, expect, it } from "vitest";
import { getCheckoutOrder, resolveCheckoutOrder } from "./checkout.service";

describe("checkout.service", () => {
  describe("getCheckoutOrder", () => {
    it("pedido válido → ok con total 910", async () => {
      const result = await getCheckoutOrder({ evento: "noche-de-sintetizadores-lima", general: "2", vip: "1" });
      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;
      expect(result.order.total).toBe(910);
      expect(result.order.ticketCount).toBe(3);
      expect(result.order.items).toEqual([
        { ticketTypeId: "general", name: "General", unitPrice: 180, quantity: 2 },
        { ticketTypeId: "vip", name: "VIP", unitPrice: 550, quantity: 1 },
      ]);
    });

    it.each([
      ["sin evento", { general: "1" }],
      ["evento vacío", { evento: "  ", general: "1" }],
      ["evento repetido", { evento: ["noche-de-sintetizadores-lima", "risas-sin-filtro"], general: "1" }],
      ["slug inexistente", { evento: "no-existe", general: "1" }],
    ])("%s → not-found", async (_, params) => {
      expect(await getCheckoutOrder(params)).toEqual({ status: "not-found" });
    });

    it("evento agotado → sold-out", async () => {
      expect(await getCheckoutOrder({ evento: "los-ecos-del-sur-arequipa", general: "1" })).toEqual({
        status: "sold-out",
        eventSlug: "los-ecos-del-sur-arequipa",
      });
    });

    it.each([
      ["tipo inexistente", { general: "1", foo: "1" }],
      ["parámetro desconocido", { general: "1", utm_source: "x" }],
      ["cantidad inválida", { general: "1.5" }],
      ["ningún tipo", {}],
    ])("%s → invalid-tickets", async (_, params) => {
      expect(await getCheckoutOrder({ evento: "noche-de-sintetizadores-lima", ...params })).toEqual({
        status: "invalid-tickets",
        eventSlug: "noche-de-sintetizadores-lima",
      });
    });

    it("tipo agotado → invalid-tickets", async () => {
      expect(await getCheckoutOrder({ evento: "risas-sin-filtro", mesa: "1" })).toEqual({
        status: "invalid-tickets",
        eventSlug: "risas-sin-filtro",
      });
    });

    it("evento gratuito → free", async () => {
      expect(await getCheckoutOrder({ evento: "aventura-en-el-bosque-magico", "entrada-libre": "1" })).toEqual({
        status: "free",
        eventSlug: "aventura-en-el-bosque-magico",
      });
    });
  });

  describe("resolveCheckoutOrder", () => {
    it("pedido válido → ok", async () => {
      const result = await resolveCheckoutOrder("noche-de-sintetizadores-lima", { general: 2, vip: 1 });
      expect(result.status === "ok" && result.order.total).toBe(910);
    });

    it("slug inexistente → not-found", async () => {
      expect(await resolveCheckoutOrder("no-existe", { general: 1 })).toEqual({ status: "not-found" });
    });
  });
});
