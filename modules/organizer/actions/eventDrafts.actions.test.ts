// @vitest-environment node
import { DrizzleQueryError } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrganizerNotApprovedError, requirePermission, type SessionUser } from "@/modules/auth/server";
import { createEvent, deleteEvent, updateEvent } from "../services/eventDrafts.service";
import type { EventDraftFormValues } from "../types/organizer.types";
import { EventDraftError } from "../utils/eventDraftError";
import { createEventAction, deleteEventAction, updateEventAction } from "./eventDrafts.actions";

vi.mock("@/modules/auth/server", async (importOriginal) => {
  const { OrganizerNotApprovedError } = await importOriginal<typeof import("@/modules/auth/server")>();
  return { requirePermission: vi.fn(), OrganizerNotApprovedError };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../services/eventDrafts.service", () => ({
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

const SESSION: Omit<SessionUser, "id" | "role"> = {
  email: "ana@example.com",
  firstName: "Ana",
  lastName: "Pérez",
  phone: "912345678",
  documentType: "dni",
  documentNumber: "87654321",
  createdAt: new Date("2026-10-01T00:00:00Z"),
  mfaVerified: false,
};
const ORGANIZER: SessionUser = { ...SESSION, id: "00000000-0000-8000-8000-000000000001", role: "organizer" };
const ADMIN: SessionUser = { ...SESSION, id: "00000000-0000-8000-8000-000000000002", role: "admin" };

const EVENT_ID = "e0000000-0000-4000-8000-000000000001";
const ORGANIZER_ID = "00000000-0000-8000-8000-000000000003";
const VENUE_ID = "5b0a3c1e-2f4d-4a6b-8c9d-0e1f2a3b4c5d";
const SECTION_ID = "11111111-1111-4111-8111-111111111111";
const GENERIC = { ok: false, error: "No pudimos completar la solicitud. Inténtalo de nuevo." };

const VALUES: EventDraftFormValues = {
  title: "  Festival  ",
  category: "festivales",
  minAge: "18",
  description: "",
  date: "2026-12-05",
  time: "20:00",
  doorsOpen: "",
  venueId: VENUE_ID,
  organizerId: "",
  imageUrl: "https://images.unsplash.com/a.jpg",
  ticketTypes: [{ sectionId: SECTION_ID, selected: true, name: "General", price: "50" }],
};

beforeEach(() => {
  vi.mocked(requirePermission).mockResolvedValue(ORGANIZER);
  vi.mocked(createEvent).mockResolvedValue({ id: EVENT_ID });
  vi.mocked(updateEvent).mockResolvedValue({ status: "draft", slug: "festival" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  // También las implementaciones (`mockRejectedValue`) de cada test.
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("todas las acciones", () => {
  const calls = [
    ["createEventAction", () => createEventAction(VALUES), createEvent],
    ["updateEventAction", () => updateEventAction(EVENT_ID, VALUES), updateEvent],
    ["deleteEventAction", () => deleteEventAction(EVENT_ID), deleteEvent],
  ] as const;

  it.each(calls)("%s exige events:manageOwn y la redirección corta antes del servicio", async (_name, run, service) => {
    vi.mocked(requirePermission).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(run()).rejects.toThrow("NEXT_REDIRECT");
    expect(requirePermission).toHaveBeenCalledWith("events:manageOwn");
    expect(service).not.toHaveBeenCalled();
  });

  it.each(calls)("%s: un organizador no aprobado → mensaje claro", async (_name, run, service) => {
    vi.mocked(service).mockRejectedValue(new OrganizerNotApprovedError("pending"));
    expect(await run()).toEqual({ ok: false, error: "Tu cuenta de organizador no está aprobada." });
    expect(console.error).not.toHaveBeenCalled();
  });

  it.each(calls)("%s: un error inesperado → mensaje genérico; el log lleva solo el SQLSTATE", async (name, run, service) => {
    const cause = Object.assign(new Error("duplicate key (slug)=(festival)"), { code: "23505" });
    vi.mocked(service).mockRejectedValue(new DrizzleQueryError("insert into events", ["festival"], cause));

    expect(await run()).toEqual(GENERIC);
    expect(console.error).toHaveBeenCalledWith(name, { name: "DrizzleQueryError", code: "23505" });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("festival");
  });
});

describe("createEventAction", () => {
  it("valida, convierte y crea con el usuario de la sesión", async () => {
    expect(await createEventAction(VALUES)).toEqual({ ok: true, id: EVENT_ID });
    expect(createEvent).toHaveBeenCalledWith(ORGANIZER, {
      title: "Festival",
      category: "festivales",
      description: null,
      startsAt: new Date("2026-12-06T01:00:00Z"),
      doorsOpenAt: null,
      minAge: 18,
      venueId: VENUE_ID,
      imageUrl: "https://images.unsplash.com/a.jpg",
      organizerId: null,
      ticketTypes: [{ sectionId: SECTION_ID, name: "General", priceCents: 5000, sortOrder: 0 }],
    });
  });

  it("rechaza una portada http sin llamar al servicio", async () => {
    expect(await createEventAction({ ...VALUES, imageUrl: "http://images.unsplash.com/a.jpg" })).toEqual({
      ok: false,
      error: "Ingresa una URL válida que empiece por https://",
    });
    expect(createEvent).not.toHaveBeenCalled();
  });

  it("rechaza un borrador sin nombre o con una entrada que no es un objeto", async () => {
    expect(await createEventAction({ ...VALUES, title: " " })).toEqual({ ok: false, error: "Ingresa el nombre del evento" });
    expect((await createEventAction("x")).ok).toBe(false);
    expect(createEvent).not.toHaveBeenCalled();
  });

  it("un admin sin organizador no puede crear", async () => {
    vi.mocked(requirePermission).mockResolvedValue(ADMIN);
    expect(await createEventAction(VALUES)).toEqual({ ok: false, error: "Elige el organizador del evento" });
    expect(createEvent).not.toHaveBeenCalled();
  });

  it("un admin crea a nombre del organizador elegido", async () => {
    vi.mocked(requirePermission).mockResolvedValue(ADMIN);
    await createEventAction({ ...VALUES, organizerId: ORGANIZER_ID });
    expect(vi.mocked(createEvent).mock.calls[0][1].organizerId).toBe(ORGANIZER_ID);
  });

  it("un organizador no elige organizador: se ignora lo que envíe", async () => {
    await createEventAction({ ...VALUES, organizerId: ORGANIZER_ID });
    expect(vi.mocked(createEvent).mock.calls[0][1].organizerId).toBeNull();
  });

  it("un error de dominio → su mensaje y su código", async () => {
    vi.mocked(createEvent).mockRejectedValue(new EventDraftError("section_not_in_venue"));
    expect(await createEventAction(VALUES)).toEqual({
      ok: false,
      error: "Alguna sección elegida no pertenece al recinto.",
      code: "section_not_in_venue",
    });
  });
});

describe("updateEventAction", () => {
  it("guarda con el id validado; un borrador no invalida páginas públicas", async () => {
    expect(await updateEventAction(EVENT_ID, VALUES)).toEqual({ ok: true });
    expect(updateEvent).toHaveBeenCalledWith(ORGANIZER, EVENT_ID, expect.objectContaining({ title: "Festival" }));
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("un evento publicado invalida el inicio, el catálogo, su detalle y su compra", async () => {
    vi.mocked(updateEvent).mockResolvedValue({ status: "published", slug: "festival" });
    expect(await updateEventAction(EVENT_ID, VALUES)).toEqual({ ok: true });
    expect(vi.mocked(revalidatePath).mock.calls.map(([path]) => path).sort()).toEqual(
      ["/", "/eventos", "/eventos/festival", "/eventos/festival/entradas"].sort(),
    );
  });

  it("un evento en revisión no se edita: pide al admin que lo rechace", async () => {
    vi.mocked(updateEvent).mockRejectedValue(new EventDraftError("edit_locked", [], "pending_review"));
    expect(await updateEventAction(EVENT_ID, VALUES)).toEqual({
      ok: false,
      error: "Está en revisión: si necesitas cambios, pide al administrador que lo rechace.",
      code: "edit_locked",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rechaza un id que no es un uuid", async () => {
    expect(await updateEventAction("1; drop table events", VALUES)).toEqual({ ok: false, error: "Evento no válido" });
    expect(updateEvent).not.toHaveBeenCalled();
  });

  it("un cambio sensible con ventas → su mensaje y su code", async () => {
    vi.mocked(updateEvent).mockRejectedValue(new EventDraftError("sensitive_locked"));
    expect(await updateEventAction(EVENT_ID, VALUES)).toEqual({
      ok: false,
      error:
        "El evento tiene ventas o reservas en curso: solo puedes cambiar el título, la descripción, la portada y la edad mínima.",
      code: "sensitive_locked",
    });
  });

  it("un evento publicado incompleto → el mensaje dice qué falta", async () => {
    vi.mocked(updateEvent).mockRejectedValue(new EventDraftError("incomplete", ["image"]));
    expect(await updateEventAction(EVENT_ID, VALUES)).toEqual({
      ok: false,
      error: "Faltan datos para publicar el evento: la portada.",
      code: "incomplete",
    });
  });
});

describe("deleteEventAction", () => {
  it("elimina con el id validado", async () => {
    expect(await deleteEventAction(EVENT_ID)).toEqual({ ok: true });
    expect(deleteEvent).toHaveBeenCalledWith(ORGANIZER, EVENT_ID);
  });

  it("rechaza un id que no es un uuid", async () => {
    expect(await deleteEventAction(42)).toEqual({ ok: false, error: "Evento no válido" });
    expect(deleteEvent).not.toHaveBeenCalled();
  });

  it("un evento que no es borrador → \"Solo se pueden eliminar borradores.\"", async () => {
    vi.mocked(deleteEvent).mockRejectedValue(new EventDraftError("delete_not_draft"));
    expect(await deleteEventAction(EVENT_ID)).toEqual({
      ok: false,
      error: "Solo se pueden eliminar borradores.",
      code: "delete_not_draft",
    });
  });
});
