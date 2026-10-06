// @vitest-environment node
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizerNotApprovedError, requirePermission, type SessionUser } from "@/modules/auth/server";
import { processDueEventNotifications, processEventNotification } from "@/modules/notifications/server";
import { approveEvent, cancelEvent, rejectEvent, submitForReview } from "../services/eventModeration.service";
import { EventDraftError } from "../utils/eventDraftError";
import {
  approveEventAction,
  cancelEventAction,
  rejectEventAction,
  submitForReviewAction,
} from "./eventModeration.actions";

vi.mock("@/modules/auth/server", async (importOriginal) => {
  const { OrganizerNotApprovedError } = await importOriginal<typeof import("@/modules/auth/server")>();
  return { requirePermission: vi.fn(), OrganizerNotApprovedError };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// `after` guarda las tareas para ejecutarlas a mano "después de responder".
const scheduled = vi.hoisted(() => [] as (() => Promise<void>)[]);
vi.mock("next/server", () => ({ after: vi.fn((task: () => Promise<void>) => scheduled.push(task)) }));
vi.mock("@/modules/notifications/server", () => ({
  processEventNotification: vi.fn(),
  processDueEventNotifications: vi.fn(),
}));
vi.mock("../services/eventModeration.service", () => ({
  submitForReview: vi.fn(),
  approveEvent: vi.fn(),
  rejectEvent: vi.fn(),
  cancelEvent: vi.fn(),
}));

const ADMIN: SessionUser = {
  id: "00000000-0000-8000-8000-000000000002",
  role: "admin",
  email: "admin@example.com",
  firstName: "Ana",
  lastName: "Pérez",
  phone: null,
  documentType: null,
  documentNumber: null,
  createdAt: new Date("2026-10-01T00:00:00Z"),
  mfaVerified: false,
};
const EVENT_ID = "e0000000-0000-4000-8000-000000000001";
const SLUG = "festival-de-verano";
/** Páginas públicas del evento: inicio, catálogo, detalle y compra. */
const PUBLIC_PATHS = ["/", "/eventos", `/eventos/${SLUG}`, `/eventos/${SLUG}/entradas`];
const revalidatedPaths = () => vi.mocked(revalidatePath).mock.calls.map(([path]) => path).sort();
const GENERIC = { ok: false, error: "No pudimos completar la solicitud. Inténtalo de nuevo." };

beforeEach(() => {
  vi.mocked(requirePermission).mockResolvedValue(ADMIN);
  vi.mocked(approveEvent).mockResolvedValue({ status: "published", slug: SLUG });
  vi.mocked(cancelEvent).mockResolvedValue({ slug: SLUG, notification: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  scheduled.length = 0;
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

const calls = [
  ["submitForReviewAction", "events:manageOwn", () => submitForReviewAction(EVENT_ID), submitForReview],
  ["approveEventAction", "events:moderate", () => approveEventAction(EVENT_ID), approveEvent],
  ["rejectEventAction", "events:moderate", () => rejectEventAction(EVENT_ID, "Falta la portada"), rejectEvent],
  ["cancelEventAction", "events:moderate", () => cancelEventAction(EVENT_ID), cancelEvent],
] as const;

describe("todas las acciones de moderación", () => {
  it.each(calls)("%s exige %s y la redirección corta antes del servicio", async (_name, permission, run, service) => {
    vi.mocked(requirePermission).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(run()).rejects.toThrow("NEXT_REDIRECT");
    expect(requirePermission).toHaveBeenCalledWith(permission);
    expect(service).not.toHaveBeenCalled();
  });

  it.each(calls)("%s llama al servicio con el actor y el id validado", async (_name, _permission, run, service) => {
    expect(await run()).toEqual({ ok: true });
    expect(vi.mocked(service).mock.calls[0].slice(0, 2)).toEqual([ADMIN, EVENT_ID]);
  });

  it.each(calls)("%s: un error inesperado da el mensaje genérico", async (_name, _permission, run, service) => {
    vi.mocked(service).mockRejectedValue(new Error("boom"));
    expect(await run()).toEqual(GENERIC);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("invalidación de las páginas públicas", () => {
  it("aprobar invalida el inicio, el catálogo, el detalle y la compra del evento", async () => {
    await approveEventAction(EVENT_ID);
    expect(revalidatedPaths()).toEqual([...PUBLIC_PATHS].sort());
  });

  it("cancelar también", async () => {
    await cancelEventAction(EVENT_ID);
    expect(revalidatedPaths()).toEqual([...PUBLIC_PATHS].sort());
  });

  it("enviar a revisión, rechazar o aprobar algo que ya no está en revisión no invalidan nada", async () => {
    vi.mocked(approveEvent).mockResolvedValue({ status: "draft", slug: SLUG });
    await submitForReviewAction(EVENT_ID);
    await rejectEventAction(EVENT_ID, "Falta la portada");
    await approveEventAction(EVENT_ID);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("submitForReviewAction", () => {
  it("rechaza un id que no es un uuid", async () => {
    expect(await submitForReviewAction("x")).toEqual({ ok: false, error: "Evento no válido" });
    expect(submitForReview).not.toHaveBeenCalled();
  });

  it("datos incompletos → el mensaje dice qué falta", async () => {
    vi.mocked(submitForReview).mockRejectedValue(new EventDraftError("incomplete", ["venue", "ticketTypes"]));
    expect(await submitForReviewAction(EVENT_ID)).toEqual({
      ok: false,
      error: "Faltan datos para publicar el evento: el recinto y al menos un tipo de entrada.",
      code: "incomplete",
    });
  });

  it("un organizador no aprobado → mensaje claro", async () => {
    vi.mocked(submitForReview).mockRejectedValue(new OrganizerNotApprovedError("suspended"));
    expect(await submitForReviewAction(EVENT_ID)).toEqual({
      ok: false,
      error: "Tu cuenta de organizador no está aprobada.",
    });
  });
});

describe("approveEventAction", () => {
  it("si el evento ya no estaba en revisión (otro lo rechazó), lo dice con un code de listado desactualizado", async () => {
    vi.mocked(approveEvent).mockResolvedValue({ status: "draft", slug: SLUG });
    expect(await approveEventAction(EVENT_ID)).toEqual({
      ok: false,
      error: "El evento ya no está en revisión.",
      code: "not_pending_review",
    });
  });
});

describe("rejectEventAction", () => {
  it("valida y recorta la nota antes del servicio", async () => {
    expect(await rejectEventAction(EVENT_ID, "   ")).toEqual({ ok: false, error: "Escribe el motivo del rechazo" });
    expect(rejectEvent).not.toHaveBeenCalled();
    await rejectEventAction(EVENT_ID, "  Falta la portada ");
    expect(rejectEvent).toHaveBeenCalledWith(ADMIN, EVENT_ID, "Falta la portada");
  });
});

describe("approveEventAction (organizador o recinto ya no aprobados)", () => {
  it.each([
    ["owner_not_approved", "El organizador del evento ya no está aprobado: no se puede publicar hasta que lo esté."],
    ["event_venue_not_approved", "El recinto del evento ya no está aprobado: no se puede publicar hasta que lo esté."],
  ] as const)("%s → mensaje claro", async (code, error) => {
    vi.mocked(approveEvent).mockRejectedValue(new EventDraftError(code));
    expect(await approveEventAction(EVENT_ID)).toEqual({ ok: false, error, code });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("cancelEventAction", () => {
  it("si encoló el aviso, tras responder lo envía y drena hasta 5 vencidas", async () => {
    const notification = { id: "a0000000-0000-4000-8000-000000000001", kind: "cancelled" as const };
    vi.mocked(cancelEvent).mockResolvedValue({ slug: SLUG, notification });
    expect(await cancelEventAction(EVENT_ID)).toEqual({ ok: true });
    expect(processEventNotification).not.toHaveBeenCalled();
    await Promise.all(scheduled.map((task) => task()));
    expect(processEventNotification).toHaveBeenCalledWith(notification.id);
    expect(processDueEventNotifications).toHaveBeenCalledWith({ limit: 5 });
  });

  it("sin compradores no programa nada", async () => {
    expect(await cancelEventAction(EVENT_ID)).toEqual({ ok: true });
    expect(scheduled).toHaveLength(0);
  });

  it("con ventas → \"Cancelación con reembolsos: Próximamente\"", async () => {
    vi.mocked(cancelEvent).mockRejectedValue(new EventDraftError("has_sales"));
    expect(await cancelEventAction(EVENT_ID)).toEqual({
      ok: false,
      error: "Cancelación con reembolsos: Próximamente. El evento tiene ventas o reservas en curso y aún no se puede cancelar.",
      code: "has_sales",
    });
  });
});
