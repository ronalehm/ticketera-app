import { describe, expect, it } from "vitest";
import { makeManagedEvent as makeEvent } from "../data/managedEvents.mock";
import { formatRevenue, getDashboardKpis, getSoldPercentage } from "./organizerStats";

const published = makeEvent("a", { sold: 120, revenueCents: 1_080_000 });
const finished = makeEvent("b", { status: "finished", sold: 30, revenueCents: 270_050 });
const review = makeEvent("c", { status: "pending_review" });
const draft = makeEvent("d", { status: "draft", startsAt: null, capacity: 1500 });
const events = [published, finished, review, draft];

describe("getDashboardKpis", () => {
  it("suma los ingresos y las vendidas de la BD y cuenta solo los publicados", () => {
    expect(getDashboardKpis(events)).toEqual({ revenueCents: 1_350_050, ticketsSold: 150, publishedCount: 1 });
  });

  it("da ceros con una lista vacía", () => {
    expect(getDashboardKpis([])).toEqual({ revenueCents: 0, ticketsSold: 0, publishedCount: 0 });
  });
});

describe("getSoldPercentage", () => {
  it.each([
    [7420, 8000, 93],
    [0, 1500, 0],
    [5, 0, 0],
    [10, 5, 100],
  ])("(%i, %i) → %i", (sold, capacity, expected) => {
    expect(getSoldPercentage(sold, capacity)).toBe(expected);
  });
});

describe("formatRevenue", () => {
  it("pasa de céntimos a soles", () => {
    expect(formatRevenue(1_350_050)).toBe("S/ 13,500.50");
    expect(formatRevenue(0)).toBe("S/ 0.00");
  });
});
