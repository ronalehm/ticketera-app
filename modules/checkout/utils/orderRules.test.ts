import { describe, expect, it } from "vitest";
import { computeOrderAmounts, getConfirmationState, RESERVATION_MINUTES } from "./orderRules";

describe("RESERVATION_MINUTES", () => {
  it("reserva 10 minutos", () => {
    expect(RESERVATION_MINUTES).toBe(10);
  });
});

describe("computeOrderAmounts", () => {
  it("suma líneas y calcula comisión y neto", () => {
    const lines = [
      { priceCents: 5000, quantity: 2 },
      { priceCents: 5000, quantity: 1 },
    ];
    expect(computeOrderAmounts(lines, 1000)).toEqual({
      ticketCount: 3,
      subtotalCents: 15000,
      platformFeeCents: 1500,
      organizerAmountCents: 13500,
    });
  });

  it.each([
    [3333, 333],
    [3335, 334],
  ])("redondea la comisión de %i al 10 %% → %i", (subtotal, fee) => {
    expect(computeOrderAmounts([{ priceCents: subtotal, quantity: 1 }], 1000).platformFeeCents).toBe(fee);
  });

  it("0 bps → sin comisión", () => {
    expect(computeOrderAmounts([{ priceCents: 4990, quantity: 3 }], 0)).toMatchObject({
      platformFeeCents: 0,
      organizerAmountCents: 14970,
    });
  });

  it("10000 bps → neto 0", () => {
    expect(computeOrderAmounts([{ priceCents: 4990, quantity: 3 }], 10000)).toMatchObject({
      platformFeeCents: 14970,
      organizerAmountCents: 0,
    });
  });

  it.each([
    [1, 1, 1234],
    [7, 3, 875],
    [12345, 2, 999],
    [99999, 5, 1],
  ])("comisión + neto = subtotal (%i × %i a %i bps)", (priceCents, quantity, bps) => {
    const { subtotalCents, platformFeeCents, organizerAmountCents } = computeOrderAmounts(
      [{ priceCents, quantity }],
      bps,
    );
    expect(platformFeeCents + organizerAmountCents).toBe(subtotalCents);
  });
});

describe("getConfirmationState", () => {
  const otherIntentStatuses = [
    null,
    "requires_payment_method",
    "requires_confirmation",
    "requires_action",
    "requires_capture",
    "canceled",
  ] as const;

  it.each([
    ["paid", "paid"],
    ["partially_refunded", "paid"],
    ["refunded", "refunded"],
    ["expired", "expired"],
  ] as const)("%s → %s sin importar el PaymentIntent ni el vencimiento", (status, expected) => {
    for (const isExpired of [false, true]) {
      for (const intent of [...otherIntentStatuses, "succeeded", "processing"] as const) {
        expect(getConfirmationState({ status, isExpired }, intent)).toBe(expected);
      }
    }
  });

  it.each(["succeeded", "processing"] as const)("pending con PaymentIntent %s → processing (vigente o vencida)", (intent) => {
    expect(getConfirmationState({ status: "pending", isExpired: false }, intent)).toBe("processing");
    expect(getConfirmationState({ status: "pending", isExpired: true }, intent)).toBe("processing");
  });

  it.each(otherIntentStatuses)("pending con PaymentIntent %s → payment-failed si sigue vigente, expired si venció", (intent) => {
    expect(getConfirmationState({ status: "pending", isExpired: false }, intent)).toBe("payment-failed");
    expect(getConfirmationState({ status: "pending", isExpired: true }, intent)).toBe("expired");
  });
});
