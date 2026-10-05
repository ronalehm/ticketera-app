// @vitest-environment node
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionUser, type SessionUser } from "@/modules/auth/server";
import { getCheckoutOrder } from "../services/checkout.service";
import { releaseOrder, reserveCheckoutOrder } from "../services/reservation.service";
import type { CheckoutOrder } from "../types/checkout.types";
import { startCheckout } from "./checkout.actions";

vi.mock("@/modules/auth/server", () => ({ getSessionUser: vi.fn() }));
vi.mock("../services/checkout.service", () => ({ getCheckoutOrder: vi.fn() }));
vi.mock("../services/reservation.service", () => ({ releaseOrder: vi.fn(), reserveCheckoutOrder: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({
  // Como el real: lanza para cortar la acción.
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

const ORDER_ID = "6f1c2a4e-8b3d-4c5e-9a7f-1b2c3d4e5f60";
const PREVIOUS_ID = "0a9b8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d";
const SELECTION = "/checkout?evento=noche&platea=2&asientos=platea-A-1,platea-A-2&general=1&general=3";
const ORDER = { event: { slug: "noche" }, items: [], quantities: {}, ticketCount: 2, total: 100 } as unknown as CheckoutOrder;
const USER = { id: "00000000-0000-4000-8000-000000000001" } as SessionUser;

const UNAVAILABLE = { error: "Esos asientos ya no están disponibles. Elige otros para continuar." };
const GENERIC_ERROR = { error: "No pudimos reservar tus entradas. Inténtalo de nuevo." };

const cookieStore = { get: vi.fn(), set: vi.fn() };

function form(selection?: string) {
  const data = new FormData();
  if (selection !== undefined) data.set("selection", selection);
  return data;
}

beforeEach(() => {
  vi.mocked(cookies).mockResolvedValue(cookieStore as unknown as Awaited<ReturnType<typeof cookies>>);
  cookieStore.get.mockReturnValue(undefined);
  vi.mocked(getCheckoutOrder).mockResolvedValue({ status: "ok", order: ORDER });
  vi.mocked(getSessionUser).mockResolvedValue(USER);
  vi.mocked(reserveCheckoutOrder).mockResolvedValue({ status: "reserved", orderId: ORDER_ID });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("startCheckout", () => {
  it("selección válida → reserva con la sesión, fija la cookie y redirige a la orden", async () => {
    await expect(startCheckout(null, form(SELECTION))).rejects.toThrow("NEXT_REDIRECT");

    expect(getCheckoutOrder).toHaveBeenCalledWith({
      evento: "noche",
      platea: "2",
      asientos: "platea-A-1,platea-A-2",
      general: ["1", "3"],
    });
    expect(reserveCheckoutOrder).toHaveBeenCalledWith(ORDER, USER.id);
    expect(cookieStore.set).toHaveBeenCalledWith("mentec_checkout", ORDER_ID, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 600,
    });
    expect(redirect).toHaveBeenCalledWith(`/checkout?orden=${ORDER_ID}`);
    expect(releaseOrder).not.toHaveBeenCalled();
  });

  it("cookie previa con UUID → releaseOrder antes de validar la selección", async () => {
    cookieStore.get.mockReturnValue({ name: "mentec_checkout", value: PREVIOUS_ID });
    await expect(startCheckout(null, form(SELECTION))).rejects.toThrow("NEXT_REDIRECT");

    expect(cookieStore.get).toHaveBeenCalledWith("mentec_checkout");
    expect(releaseOrder).toHaveBeenCalledWith(PREVIOUS_ID);
    expect(vi.mocked(releaseOrder).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(getCheckoutOrder).mock.invocationCallOrder[0],
    );
  });

  it("cookie previa que no es UUID → no llama a releaseOrder", async () => {
    cookieStore.get.mockReturnValue({ name: "mentec_checkout", value: "abc" });
    await expect(startCheckout(null, form(SELECTION))).rejects.toThrow("NEXT_REDIRECT");
    expect(releaseOrder).not.toHaveBeenCalled();
  });

  it.each([
    ["ausente", undefined],
    ["sin prefijo /checkout?", "/eventos/noche?evento=noche"],
    ["de más de 2000 caracteres", `/checkout?evento=${"a".repeat(2000)}`],
  ])("selección %s → error sin llamar a servicios", async (_case, selection) => {
    expect(await startCheckout(null, form(selection))).toEqual(UNAVAILABLE);
    expect(releaseOrder).not.toHaveBeenCalled();
    expect(getCheckoutOrder).not.toHaveBeenCalled();
    expect(reserveCheckoutOrder).not.toHaveBeenCalled();
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it.each(["invalid-tickets", "sold-out"] as const)("getCheckoutOrder %s → asientos no disponibles", async (status) => {
    vi.mocked(getCheckoutOrder).mockResolvedValue({ status, eventSlug: "noche" });
    expect(await startCheckout(null, form(SELECTION))).toEqual(UNAVAILABLE);
    expect(reserveCheckoutOrder).not.toHaveBeenCalled();
  });

  it.each(["invalid", "unavailable"] as const)("reserva %s → asientos no disponibles, sin cookie", async (status) => {
    vi.mocked(reserveCheckoutOrder).mockResolvedValue({ status });
    expect(await startCheckout(null, form(SELECTION))).toEqual(UNAVAILABLE);
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("evento inexistente → error genérico", async () => {
    vi.mocked(getCheckoutOrder).mockResolvedValue({ status: "not-found" });
    expect(await startCheckout(null, form(SELECTION))).toEqual(GENERIC_ERROR);
    expect(reserveCheckoutOrder).not.toHaveBeenCalled();
  });

  it("evento gratuito → error genérico", async () => {
    vi.mocked(getCheckoutOrder).mockResolvedValue({ status: "free", eventSlug: "noche" });
    expect(await startCheckout(null, form(SELECTION))).toEqual(GENERIC_ERROR);
  });

  it("excepción inesperada → error genérico y log sin el mensaje", async () => {
    vi.mocked(reserveCheckoutOrder).mockRejectedValue(new Error("datos de ana@example.com"));
    expect(await startCheckout(null, form(SELECTION))).toEqual(GENERIC_ERROR);
    expect(console.error).toHaveBeenCalledWith("startCheckout", { name: "Error", code: undefined });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sin sesión → reserva como invitado", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    await expect(startCheckout(null, form(SELECTION))).rejects.toThrow("NEXT_REDIRECT");
    expect(reserveCheckoutOrder).toHaveBeenCalledWith(ORDER, null);
  });

  it("getSessionUser lanza → reserva como invitado", async () => {
    vi.mocked(getSessionUser).mockRejectedValue(new Error("clerk caído"));
    await expect(startCheckout(null, form(SELECTION))).rejects.toThrow("NEXT_REDIRECT");
    expect(reserveCheckoutOrder).toHaveBeenCalledWith(ORDER, null);
  });
});
