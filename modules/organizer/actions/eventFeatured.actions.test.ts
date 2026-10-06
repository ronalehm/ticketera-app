// @vitest-environment node
import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requirePermission, type SessionUser } from "@/modules/auth/server";
import { setEventFeatured } from "../services/eventFeatured.service";
import { EventDraftError } from "../utils/eventDraftError";
import { setEventFeaturedAction } from "./eventFeatured.actions";

vi.mock("@/modules/auth/server", async (importOriginal) => {
  const { OrganizerNotApprovedError } = await importOriginal<typeof import("@/modules/auth/server")>();
  return { requirePermission: vi.fn(), OrganizerNotApprovedError };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../services/eventFeatured.service", () => ({ setEventFeatured: vi.fn() }));

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
const revalidatedPaths = () => vi.mocked(revalidatePath).mock.calls.map(([path]) => path).sort();

beforeEach(() => {
  vi.mocked(requirePermission).mockResolvedValue(ADMIN);
  vi.mocked(setEventFeatured).mockResolvedValue({ slug: SLUG, status: "published" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("setEventFeaturedAction", () => {
  it("exige events:manageAny: la redirección (un organizador) corta antes del servicio", async () => {
    vi.mocked(requirePermission).mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(setEventFeaturedAction(EVENT_ID, true)).rejects.toThrow("NEXT_REDIRECT");
    expect(requirePermission).toHaveBeenCalledWith("events:manageAny");
    expect(setEventFeatured).not.toHaveBeenCalled();
  });

  it("destaca un publicado e invalida la landing y sus páginas públicas", async () => {
    expect(await setEventFeaturedAction(EVENT_ID, true)).toEqual({ ok: true, featured: true });
    expect(setEventFeatured).toHaveBeenCalledWith(ADMIN, EVENT_ID, true);
    expect(revalidatedPaths()).toEqual(["/", "/eventos", `/eventos/${SLUG}`, `/eventos/${SLUG}/entradas`].sort());
  });

  it("un borrador queda destacado y solo se invalida la landing", async () => {
    vi.mocked(setEventFeatured).mockResolvedValue({ slug: SLUG, status: "draft" });
    expect(await setEventFeaturedAction(EVENT_ID, false)).toEqual({ ok: true, featured: false });
    expect(revalidatedPaths()).toEqual(["/"]);
  });

  it.each([
    ["un id que no es uuid", "x", true, "Evento no válido"],
    ["featured que no es booleano", EVENT_ID, "true", "Invalid input: expected boolean, received string"],
  ])("rechaza %s sin llamar al servicio", async (_label, id, featured, error) => {
    expect(await setEventFeaturedAction(id, featured)).toEqual({ ok: false, error });
    expect(setEventFeatured).not.toHaveBeenCalled();
  });

  it.each([
    ["not_found", "El evento no existe o no tienes acceso a él."],
    ["feature_not_allowed", "Solo un administrador puede destacar eventos."],
  ] as const)("%s → su mensaje y code, sin invalidar", async (code, error) => {
    vi.mocked(setEventFeatured).mockRejectedValue(new EventDraftError(code));
    expect(await setEventFeaturedAction(EVENT_ID, true)).toEqual({ ok: false, error, code });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("un error inesperado da el mensaje genérico", async () => {
    vi.mocked(setEventFeatured).mockRejectedValue(new Error("boom"));
    expect(await setEventFeaturedAction(EVENT_ID, true)).toEqual({
      ok: false,
      error: "No pudimos completar la solicitud. Inténtalo de nuevo.",
    });
  });
});
