// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeWithDb } from "@/lib/db/testDb";
import { getVenueMapBySlug, type Seat } from "@/modules/seating";
import { getCheckoutOrder, resolveCheckoutOrder } from "./checkout.service";

describeWithDb("checkout.service", () => {
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

  describe("asientos", () => {
    const slug = "noche-de-sintetizadores-lima";

    async function getNorteSeats(status: Seat["status"]) {
      const map = await getVenueMapBySlug(slug);
      const norte = map?.zones.find((zone) => zone.id === "norte");
      if (norte?.kind !== "numbered") throw new Error("Falta la zona numerada norte en el mock");
      return norte.rows.flatMap((row) => row.seats).filter((seat) => seat.status === status);
    }

    it("norte=2 con 2 asientos disponibles del mapa real → ok con total 440 y etiquetas", async () => {
      const [first, second] = await getNorteSeats("available");
      const result = await getCheckoutOrder({ evento: slug, norte: "2", asientos: `${first.id},${second.id}` });
      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;
      expect(result.order.total).toBe(440);
      expect(result.order.ticketCount).toBe(2);
      expect(result.order.items).toEqual([
        {
          ticketTypeId: "norte",
          name: "Tribuna Norte",
          unitPrice: 220,
          quantity: 2,
          seats: [
            { id: first.id, label: `Tribuna Norte · Fila ${first.row} · Asiento ${first.number}` },
            { id: second.id, label: `Tribuna Norte · Fila ${second.row} · Asiento ${second.number}` },
          ],
        },
      ]);
    });

    it("combina entradas de pie y asientos", async () => {
      const [seat] = await getNorteSeats("available");
      const result = await getCheckoutOrder({ evento: slug, general: "2", norte: "1", asientos: seat.id });
      expect(result.status === "ok" && result.order.total).toBe(580);
    });

    it.each([
      ["norte=2 sin asientos", async () => ({ norte: "2" })],
      ["asiento ocupado", async () => ({ norte: "1", asientos: (await getNorteSeats("occupied"))[0].id })],
      ["1 solo asiento para norte=2", async () => ({ norte: "2", asientos: (await getNorteSeats("available"))[0].id })],
      ["asientos vacío", async () => ({ norte: "1", asientos: "" })],
      [
        "asientos repetidos",
        async () => {
          const [seat] = await getNorteSeats("available");
          return { norte: "2", asientos: `${seat.id},${seat.id}` };
        },
      ],
      [
        "asientos como array",
        async () => {
          const [first, second] = await getNorteSeats("available");
          return { norte: "2", asientos: [first.id, second.id] };
        },
      ],
    ])("%s → invalid-tickets", async (_, getParams) => {
      expect(await getCheckoutOrder({ evento: slug, ...(await getParams()) })).toEqual({
        status: "invalid-tickets",
        eventSlug: slug,
      });
    });

    it("asientos en un evento sin mapa → invalid-tickets", async () => {
      expect(
        await getCheckoutOrder({ evento: "clasico-del-pacifico", popular: "1", asientos: "popular-A-1" }),
      ).toEqual({ status: "invalid-tickets", eventSlug: "clasico-del-pacifico" });
    });

    it("resolveCheckoutOrder con seatIds por defecto sigue igual: líneas sin seats", async () => {
      const result = await resolveCheckoutOrder(slug, { general: 2, vip: 1 });
      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;
      expect(result.order.items.every((item) => item.seats === undefined)).toBe(true);
    });

    it("resolveCheckoutOrder con una zona numerada y sin seatIds → invalid-tickets", async () => {
      expect(await resolveCheckoutOrder(slug, { norte: 1 })).toEqual({ status: "invalid-tickets", eventSlug: slug });
    });
  });
});
