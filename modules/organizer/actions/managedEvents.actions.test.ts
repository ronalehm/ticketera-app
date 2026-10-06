// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/modules/auth/server";
import { requirePermission } from "@/modules/auth/server";
import { listManagedEvents } from "@/modules/events/server";
import { makeManagedEvent } from "../data/managedEvents.mock";
import { listManagedEventsAction } from "./managedEvents.actions";

vi.mock("@/modules/auth/server", () => ({ requirePermission: vi.fn() }));
vi.mock("@/modules/events/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/events/server")>()),
  listManagedEvents: vi.fn(),
}));

const USER: SessionUser = {
  id: "00000000-0000-8000-8000-000000000001",
  email: "ana@example.com",
  firstName: "Ana",
  lastName: "Pérez",
  phone: "912345678",
  documentType: "dni",
  documentNumber: "87654321",
  role: "organizer",
  createdAt: new Date("2026-10-01T00:00:00Z"),
  mfaVerified: false,
};

const EVENTS = [makeManagedEvent("a", { sold: 3, revenueCents: 13_500 })];

afterEach(() => {
  vi.clearAllMocks();
});

describe("listManagedEventsAction", () => {
  it("exige events:manageOwn y lista con el usuario de la sesión y los filtros normalizados", async () => {
    vi.mocked(requirePermission).mockResolvedValue(USER);
    vi.mocked(listManagedEvents).mockResolvedValue(EVENTS);

    expect(await listManagedEventsAction({ status: "published", q: "  neón " })).toEqual(EVENTS);
    expect(requirePermission).toHaveBeenCalledWith("events:manageOwn");
    expect(listManagedEvents).toHaveBeenCalledWith(USER, { status: "published", q: "neón", from: "", to: "" });
  });

  it("sin filtros usa todos los estados y sin búsqueda", async () => {
    vi.mocked(requirePermission).mockResolvedValue(USER);
    vi.mocked(listManagedEvents).mockResolvedValue([]);

    await listManagedEventsAction({});
    expect(listManagedEvents).toHaveBeenCalledWith(USER, { status: "all", q: "", from: "", to: "" });
  });

  it.each([
    ["un estado desconocido", { status: "archived" }],
    ["un texto que no es string", { q: 42 }],
    ["una búsqueda de más de 100 caracteres", { q: "a".repeat(101) }],
    ["una entrada que no es objeto", "published"],
  ])("rechaza %s sin consultar", async (_case, input) => {
    vi.mocked(requirePermission).mockResolvedValue(USER);

    await expect(listManagedEventsAction(input)).rejects.toThrow();
    expect(listManagedEvents).not.toHaveBeenCalled();
  });

  it("sin permiso, la redirección de requirePermission corta antes de consultar", async () => {
    vi.mocked(requirePermission).mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(listManagedEventsAction({})).rejects.toThrow("NEXT_REDIRECT");
    expect(listManagedEvents).not.toHaveBeenCalled();
  });
});
