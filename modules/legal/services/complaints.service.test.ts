import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { complaintFormSchema } from "../schemas/complaint.schema";
import type { ComplaintFormData } from "../types/legal.types";

// El contador vive en memoria del módulo: cada test importa una instancia nueva para empezar en 1.
async function loadService() {
  vi.resetModules();
  return import("./complaints.service");
}

const input: ComplaintFormData = complaintFormSchema.parse({
  firstName: "Ana",
  lastName: "Quispe",
  documentType: "dni",
  documentNumber: "12345678",
  address: "Av. Arequipa 123, Lima",
  phone: "912345678",
  email: "ana@correo.pe",
  isMinor: false,
  guardianFirstName: "",
  guardianLastName: "",
  guardianDocumentType: "dni",
  guardianDocumentNumber: "",
  itemType: "service",
  amount: "",
  itemDescription: "2 entradas para Noche de sintetizadores, pedido MT-AB12CD",
  complaintType: "claim",
  detail: "El evento empezó dos horas tarde.",
  request: "Devolución parcial del precio.",
});

const NOW = new Date("2026-10-03T15:30:00-05:00");

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("submitComplaint", () => {
  it("sigue pendiente antes de MOCK_LATENCY_MS (800 ms) y se resuelve al cumplirse", async () => {
    const { MOCK_LATENCY_MS, submitComplaint } = await loadService();
    const resolved = vi.fn();
    submitComplaint(input, NOW).then(resolved);

    expect(MOCK_LATENCY_MS).toBe(800);
    await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MS - 1);
    expect(resolved).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toHaveBeenCalledWith({ code: "LR-2026-000001", submittedAt: NOW.toISOString() });
  });

  it("asigna códigos correlativos por año y devuelve submittedAt igual a now", async () => {
    const { MOCK_LATENCY_MS, submitComplaint } = await loadService();

    const first = submitComplaint(input, NOW);
    await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MS);
    const second = submitComplaint(input, NOW);
    await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MS);

    expect(await first).toEqual({ code: "LR-2026-000001", submittedAt: NOW.toISOString() });
    expect(await second).toEqual({ code: "LR-2026-000002", submittedAt: NOW.toISOString() });
  });

  it("toma el año de now en America/Lima y lleva un contador independiente por año", async () => {
    const { MOCK_LATENCY_MS, submitComplaint } = await loadService();
    const newYearUtc = new Date("2026-01-01T03:00:00Z"); // 31/12/2025 22:00 en Lima

    const lima2025 = submitComplaint(input, newYearUtc);
    await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MS);
    const lima2026 = submitComplaint(input, NOW);
    await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MS);

    expect(await lima2025).toEqual({ code: "LR-2025-000001", submittedAt: "2026-01-01T03:00:00.000Z" });
    expect((await lima2026).code).toBe("LR-2026-000001");
  });

  it("no hace peticiones de red ni registra los datos en consola", async () => {
    const { MOCK_LATENCY_MS, submitComplaint } = await loadService();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const logSpies = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    );

    const promise = submitComplaint(input, NOW);
    await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MS);
    await promise;

    expect(fetchSpy).not.toHaveBeenCalled();
    for (const spy of logSpies) expect(spy).not.toHaveBeenCalled();
  });
});
