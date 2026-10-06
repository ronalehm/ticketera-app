import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteEventAction } from "../actions/eventDrafts.actions";
import { setEventFeaturedAction } from "../actions/eventFeatured.actions";
import {
  approveEventAction,
  cancelEventAction,
  rejectEventAction,
  submitForReviewAction,
} from "../actions/eventModeration.actions";
import { listManagedEventsAction } from "../actions/managedEvents.actions";
import { makeManagedEvent as makeEvent } from "../data/managedEvents.mock";
import { OrganizerEventsList } from "./OrganizerEventsList";

vi.mock("../actions/managedEvents.actions", () => ({ listManagedEventsAction: vi.fn() }));
vi.mock("../actions/eventDrafts.actions", () => ({ deleteEventAction: vi.fn() }));
vi.mock("../actions/eventFeatured.actions", () => ({ setEventFeaturedAction: vi.fn() }));
vi.mock("../actions/eventModeration.actions", () => ({
  submitForReviewAction: vi.fn(),
  approveEventAction: vi.fn(),
  rejectEventAction: vi.fn(),
  cancelEventAction: vi.fn(),
}));

const EVENTS = [
  makeEvent("a", { sold: 30, revenueCents: 270_000 }),
  makeEvent("b", { status: "pending_review" }),
  makeEvent("c", { status: "draft", startsAt: null, city: null, capacity: 1500 }),
  makeEvent("d", { status: "cancelled" }),
  makeEvent("e", { status: "finished", sold: 10, revenueCents: 90_000 }),
];

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

/** Lista de tarjetas (< lg); la tabla tiene las mismas filas. */
const cards = () => within(screen.getByRole("list", { name: "Mis eventos" }));
/** Tabla (lg): jsdom no aplica `hidden`, así que conviven las dos representaciones. */
const table = () => within(screen.getByRole("table", { name: "Mis eventos" }));
const rowOf = (title: string) =>
  within(table().getByRole("rowheader", { name: new RegExp(title) }).closest("tr") as HTMLElement);

const CANCEL_BLOCKED_REASON = "Tiene ventas o reservas en curso · Cancelación con reembolsos: Próximamente";

/** Abre «Más acciones» de una fila de la tabla y devuelve el menú. */
async function openRowMenu(title: string) {
  fireEvent.click(rowOf(title).getByRole("button", { name: `Más acciones de ${title}` }));
  return within(await screen.findByRole("menu"));
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("OrganizerEventsList", () => {
  it("muestra los eventos del servidor sin pedirlos otra vez, con un badge por estado", () => {
    renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} />);

    expect(listManagedEventsAction).not.toHaveBeenCalled();
    expect(screen.getByText("5 eventos")).toBeTruthy();
    const list = cards();
    for (const label of ["Publicado", "En revisión", "Borrador", "Cancelado", "Finalizado"]) {
      expect(list.getByText(label)).toBeTruthy();
    }
    expect(list.getByText("Fecha por definir")).toBeTruthy();
    expect(list.getByText("1,500", { exact: false })).toBeTruthy();
  });

  it("el filtro de estado ofrece todos los estados y pide la lista filtrada al servidor", async () => {
    vi.mocked(listManagedEventsAction).mockResolvedValue([EVENTS[1]]);
    renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} />);

    const select = screen.getByLabelText("Estado") as HTMLSelectElement;
    expect([...select.options].map((option) => option.text)).toEqual([
      "Todos los estados",
      "Borrador",
      "En revisión",
      "Publicado",
      "Cancelado",
      "Finalizado",
    ]);
    fireEvent.change(select, { target: { value: "pending_review" } });

    expect(listManagedEventsAction).toHaveBeenCalledWith({ status: "pending_review", q: "", from: "", to: "" });
    await waitFor(() => expect(screen.getByText("1 evento")).toBeTruthy());
    expect(cards().getAllByRole("listitem")).toHaveLength(1);
  });

  it("busca al enviar el formulario, sin espacios sobrantes", async () => {
    vi.mocked(listManagedEventsAction).mockResolvedValue([]);
    renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} />);

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "  feria " } });
    expect(listManagedEventsAction).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByRole("search"));

    expect(listManagedEventsAction).toHaveBeenCalledWith({ status: "all", q: "feria", from: "", to: "" });
    await waitFor(() => expect(screen.getByText("No hay eventos con estos filtros.")).toBeTruthy());
  });

  describe("filtros de fecha y limpiar", () => {
    // Solo Date: el calendario abre en octubre de 2026 sin congelar los timers de TanStack Query.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 9, 5, 12));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    const dayButton = (day: number) =>
      screen.getByRole("button", { name: new RegExp(`\\b${day} de octubre de 2026`) });

    it("Desde y Hasta filtran al elegir el día, y Hasta no permite días anteriores a Desde", async () => {
      vi.mocked(listManagedEventsAction).mockResolvedValue([EVENTS[0]]);
      renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} />);

      fireEvent.click(screen.getByLabelText("Desde"));
      fireEvent.click(dayButton(5));
      expect(listManagedEventsAction).toHaveBeenCalledWith({ status: "all", q: "", from: "2026-10-05", to: "" });

      fireEvent.click(screen.getByLabelText("Hasta"));
      expect(dayButton(4).hasAttribute("disabled")).toBe(true);
      expect(dayButton(5).hasAttribute("disabled")).toBe(false);
      fireEvent.click(dayButton(10));
      expect(listManagedEventsAction).toHaveBeenLastCalledWith({
        status: "all",
        q: "",
        from: "2026-10-05",
        to: "2026-10-10",
      });
      await waitFor(() => expect(screen.getByText("1 evento")).toBeTruthy());

      // Desde ya no permite días posteriores a Hasta.
      fireEvent.click(screen.getByLabelText("Desde"));
      expect(dayButton(11).hasAttribute("disabled")).toBe(true);
    });

    it("Limpiar filtros vacía el campo de búsqueda, restablece los cuatro filtros y desaparece", async () => {
      vi.mocked(listManagedEventsAction).mockResolvedValue([]);
      renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} />);
      expect(screen.queryByRole("button", { name: "Limpiar filtros" })).toBeNull();

      const search = screen.getByLabelText("Buscar") as HTMLInputElement;
      fireEvent.change(search, { target: { value: "feria" } });
      fireEvent.submit(screen.getByRole("search"));
      fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "draft" } });
      fireEvent.click(screen.getByLabelText("Desde"));
      fireEvent.click(dayButton(5));
      expect(listManagedEventsAction).toHaveBeenLastCalledWith({
        status: "draft",
        q: "feria",
        from: "2026-10-05",
        to: "",
      });
      await waitFor(() => expect(screen.getByText("No hay eventos con estos filtros.")).toBeTruthy());

      fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));

      expect(search.value).toBe("");
      expect((screen.getByLabelText("Estado") as HTMLSelectElement).value).toBe("all");
      expect(screen.getByLabelText("Desde").textContent).toBe("Cualquier fecha");
      // Vuelven los eventos del servidor (filtros por defecto), sin otra petición.
      expect(screen.getByText("5 eventos")).toBeTruthy();
      expect(listManagedEventsAction).toHaveBeenCalledTimes(3);
      expect(screen.queryByRole("button", { name: "Limpiar filtros" })).toBeNull();
    });
  });

  it("con canCreate, «Crear evento» está dentro de la sección del listado; sin él no aparece", () => {
    const { unmount } = renderWithQuery(
      <OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} canCreate />,
    );
    const section = within(screen.getByRole("region", { name: "Mis eventos" }));
    expect(section.getByRole("link", { name: "Crear evento" }).getAttribute("href")).toBe("/organizador/eventos/nuevo");
    unmount();

    renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} />);
    expect(screen.queryByRole("link", { name: "Crear evento" })).toBeNull();
  });

  it("sin eventos lo dice", () => {
    renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={[]} />);
    expect(screen.getByText("Aún no tienes eventos.")).toBeTruthy();
  });

  it("si falla la carga lo anuncia", async () => {
    vi.mocked(listManagedEventsAction).mockRejectedValue(new Error("fallo"));
    renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} />);

    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "draft" } });
    expect((await screen.findByRole("alert")).textContent).toBe("No pudimos cargar los eventos. Inténtalo de nuevo.");
  });

  it("si falla la carga no dice que no hay eventos con esos filtros", async () => {
    vi.mocked(listManagedEventsAction).mockRejectedValue(new Error("fallo"));
    renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} />);

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "nada" } });
    fireEvent.submit(screen.getByRole("search"));
    await screen.findByRole("alert");
    expect(screen.queryByText("No hay eventos con estos filtros.")).toBeNull();
    expect(screen.queryByText("Aún no tienes eventos.")).toBeNull();
  });

  it("muestra el organizador de cada evento solo con showOrganizer (admin)", () => {
    const { unmount } = renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} />);
    expect(cards().queryByText(/Productora a/)).toBeNull();
    unmount();

    renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} showOrganizer />);
    expect(cards().getByText(/Productora a/)).toBeTruthy();
  });

  describe("acciones de borrador", () => {
    it("con canMutate, borrador y publicado se editan (en revisión no); solo el borrador se elimina", () => {
      renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} canMutate />);

      const list = cards();
      expect(list.getAllByRole("link", { name: /^Editar/ }).map((link) => link.getAttribute("href"))).toEqual([
        "/organizador/eventos/a/editar",
        "/organizador/eventos/c/editar",
      ]);
      // En revisión, un organizador no tiene acciones (ni Editar).
      const pending = cards().getByRole("heading", { name: "Evento b" }).closest("li") as HTMLElement;
      expect(within(pending).queryAllByRole("link")).toHaveLength(0);
      expect(within(pending).queryAllByRole("button")).toHaveLength(0);
      expect(list.getAllByRole("button", { name: /^Eliminar/ })).toHaveLength(1);
      expect(list.getByRole("button", { name: "Eliminar Evento c" })).toBeTruthy();
      // La tabla (lg) tiene la columna de acciones.
      expect(screen.getByRole("columnheader", { name: "Acciones" })).toBeTruthy();
    });

    it("para un organizador, cancelado y finalizado no tienen acciones (ni el pie de acciones de la tarjeta)", () => {
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} canMutate role="organizer" />);
      for (const title of ["Evento d", "Evento e"]) {
        const card = cards().getByRole("heading", { name: title }).closest("li") as HTMLElement;
        expect(within(card).queryAllByRole("button")).toHaveLength(0);
        expect(within(card).queryAllByRole("link")).toHaveLength(0);
        expect(card.querySelector(".border-t")).toBeNull();
      }
    });

    it("sin canMutate (solo lectura) no hay acciones", () => {
      renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} />);
      expect(screen.queryByRole("link", { name: /^Editar/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /^Eliminar/ })).toBeNull();
      expect(screen.queryByRole("columnheader", { name: "Acciones" })).toBeNull();
    });

    it("Eliminar pide confirmación, elimina, avisa y recarga el listado", async () => {
      vi.mocked(deleteEventAction).mockResolvedValue({ ok: true });
      vi.mocked(listManagedEventsAction).mockResolvedValue(EVENTS.filter((event) => event.id !== "c"));
      renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} canMutate />);

      fireEvent.click(cards().getByRole("button", { name: "Eliminar Evento c" }));
      const dialog = await screen.findByRole("alertdialog");
      expect(within(dialog).getByText("¿Eliminar el borrador «Evento c»?")).toBeTruthy();
      expect(deleteEventAction).not.toHaveBeenCalled();
      fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

      await waitFor(() => expect(screen.getByText("Borrador «Evento c» eliminado")).toBeTruthy());
      expect(deleteEventAction).toHaveBeenCalledWith("c");
      expect(listManagedEventsAction).toHaveBeenCalledWith({ status: "all", q: "", from: "", to: "" });
      await waitFor(() => expect(screen.getByText("4 eventos")).toBeTruthy());
    });

    it("si eliminar falla, el error se muestra en el diálogo", async () => {
      vi.mocked(deleteEventAction).mockResolvedValue({ ok: false, error: "Solo se pueden eliminar borradores." });
      renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} canMutate />);

      fireEvent.click(cards().getByRole("button", { name: "Eliminar Evento c" }));
      const dialog = await screen.findByRole("alertdialog");
      fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

      expect((await within(dialog).findByRole("alert")).textContent).toBe("Solo se pueden eliminar borradores.");
      expect(screen.queryByText(/eliminado$/)).toBeNull();
    });
  });

  describe("moderación (F5b)", () => {
    /** Publicado sin ventas: se puede cancelar. */
    const UNSOLD = makeEvent("p");
    const cardOf = (title: string) => within(cards().getByRole("heading", { name: title }).closest("li") as HTMLElement);

    it("un organizador envía su borrador a revisión, pero no aprueba, rechaza ni cancela", () => {
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} canMutate role="organizer" />);
      expect(cardOf("Evento c").getByRole("button", { name: "Enviar a revisión Evento c" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: /^Aprobar/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /^Rechazar/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /^Cancelar evento/ })).toBeNull();
    });

    it("un admin aprueba o rechaza lo que está en revisión y cancela lo publicado", () => {
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} canMutate role="admin" />);
      expect(cardOf("Evento b").getByRole("button", { name: "Aprobar Evento b" })).toBeTruthy();
      expect(cardOf("Evento b").getByRole("button", { name: "Rechazar Evento b" })).toBeTruthy();
      expect(cardOf("Evento a").getByRole("button", { name: "Cancelar evento Evento a" })).toBeTruthy();
      expect(cardOf("Evento c").getByRole("button", { name: "Enviar a revisión Evento c" })).toBeTruthy();
    });

    it.each([
      ["ventas pagadas", { sold: 3, hasActiveSales: true }],
      ["solo una reserva pendiente vigente (0 vendidas)", { sold: 0, hasActiveSales: true }],
    ])("con %s, Cancelar evento queda deshabilitado con el motivo", (_label, overrides) => {
      const events = [makeEvent("a", overrides)];
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={events} canMutate role="admin" />);
      const button = cardOf("Evento a").getByRole("button", { name: "Cancelar evento Evento a" });
      expect(button.getAttribute("aria-disabled") === "true" || button.hasAttribute("disabled")).toBe(true);
      const reason = document.getElementById(button.getAttribute("aria-describedby") ?? "");
      expect(reason?.textContent).toBe(CANCEL_BLOCKED_REASON);
    });

    it("Enviar a revisión pide confirmación, envía, avisa y recarga el listado", async () => {
      vi.mocked(submitForReviewAction).mockResolvedValue({ ok: true });
      vi.mocked(listManagedEventsAction).mockResolvedValue(EVENTS);
      renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} canMutate />);

      fireEvent.click(cardOf("Evento c").getByRole("button", { name: "Enviar a revisión Evento c" }));
      const dialog = await screen.findByRole("alertdialog", { name: "¿Enviar «Evento c» a revisión?" });
      expect(submitForReviewAction).not.toHaveBeenCalled();
      fireEvent.click(within(dialog).getByRole("button", { name: "Enviar a revisión" }));

      await waitFor(() => expect(screen.getByText("«Evento c» enviado a revisión")).toBeTruthy());
      expect(submitForReviewAction).toHaveBeenCalledWith("c");
      expect(listManagedEventsAction).toHaveBeenCalledWith({ status: "all", q: "", from: "", to: "" });
    });

    it("si enviar a revisión falla por datos incompletos, el diálogo dice qué falta", async () => {
      vi.mocked(submitForReviewAction).mockResolvedValue({
        ok: false,
        error: "Faltan datos para publicar el evento: la portada.",
        code: "incomplete",
      });
      renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} canMutate />);

      fireEvent.click(cardOf("Evento c").getByRole("button", { name: "Enviar a revisión Evento c" }));
      const dialog = await screen.findByRole("alertdialog");
      fireEvent.click(within(dialog).getByRole("button", { name: "Enviar a revisión" }));
      expect((await within(dialog).findByRole("alert")).textContent).toBe(
        "Faltan datos para publicar el evento: la portada.",
      );
      expect(listManagedEventsAction).not.toHaveBeenCalled();
    });

    it("Aprobar pide confirmación y avisa de que se publicó", async () => {
      vi.mocked(approveEventAction).mockResolvedValue({ ok: true });
      vi.mocked(listManagedEventsAction).mockResolvedValue(EVENTS);
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} canMutate role="admin" />);

      fireEvent.click(cardOf("Evento b").getByRole("button", { name: "Aprobar Evento b" }));
      const dialog = await screen.findByRole("alertdialog", { name: "¿Aprobar y publicar «Evento b»?" });
      fireEvent.click(within(dialog).getByRole("button", { name: "Aprobar y publicar" }));

      await waitFor(() => expect(screen.getByText("«Evento b» aprobado y publicado")).toBeTruthy());
      expect(approveEventAction).toHaveBeenCalledWith("b");
    });

    it("Rechazar exige el motivo y lo envía", async () => {
      vi.mocked(rejectEventAction).mockResolvedValue({ ok: true });
      vi.mocked(listManagedEventsAction).mockResolvedValue(EVENTS);
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} canMutate role="admin" />);

      fireEvent.click(cardOf("Evento b").getByRole("button", { name: "Rechazar Evento b" }));
      const dialog = await screen.findByRole("dialog", { name: "¿Rechazar «Evento b»?" });
      fireEvent.click(within(dialog).getByRole("button", { name: "Rechazar" }));
      const note = within(dialog).getByLabelText("Motivo del rechazo");
      await waitFor(() => expect(note.getAttribute("aria-invalid")).toBe("true"));
      expect(within(dialog).getByText("Escribe el motivo del rechazo")).toBeTruthy();
      expect(rejectEventAction).not.toHaveBeenCalled();

      fireEvent.change(note, { target: { value: "Falta la hora de apertura." } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Rechazar" }));
      await waitFor(() => expect(screen.getByText("«Evento b» rechazado")).toBeTruthy());
      expect(rejectEventAction).toHaveBeenCalledWith("b", "Falta la hora de apertura.");
    });

    it("Cancelar evento pide confirmación (con «Volver») y lo cancela", async () => {
      vi.mocked(cancelEventAction).mockResolvedValue({ ok: true });
      vi.mocked(listManagedEventsAction).mockResolvedValue([UNSOLD]);
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={[UNSOLD]} canMutate role="admin" />);

      fireEvent.click(cardOf("Evento p").getByRole("button", { name: "Cancelar evento Evento p" }));
      const dialog = await screen.findByRole("alertdialog", { name: "¿Cancelar «Evento p»?" });
      expect(within(dialog).getByRole("button", { name: "Volver" })).toBeTruthy();
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar evento" }));

      await waitFor(() => expect(screen.getByText("«Evento p» cancelado")).toBeTruthy());
      expect(cancelEventAction).toHaveBeenCalledWith("p");
    });

    it("si cancelar falla porque entraron ventas, lo dice en el diálogo", async () => {
      vi.mocked(cancelEventAction).mockResolvedValue({
        ok: false,
        error: "Cancelación con reembolsos: Próximamente. El evento tiene ventas o reservas en curso y aún no se puede cancelar.",
        code: "has_sales",
      });
      vi.mocked(listManagedEventsAction).mockResolvedValue([UNSOLD]);
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={[UNSOLD]} canMutate role="admin" />);

      fireEvent.click(cardOf("Evento p").getByRole("button", { name: "Cancelar evento Evento p" }));
      const dialog = await screen.findByRole("alertdialog");
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar evento" }));
      expect((await within(dialog).findByRole("alert")).textContent).toMatch(/^Cancelación con reembolsos: Próximamente/);
    });
  });

  describe("acciones compactas en la tabla (lg)", () => {
    it("un borrador muestra [Editar] de icono y [•••] con Eliminar y Enviar a revisión (ítems de 44 px)", async () => {
      renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} canMutate />);

      const row = rowOf("Evento c");
      const edit = row.getByRole("link", { name: "Editar Evento c" });
      expect(edit.getAttribute("href")).toBe("/organizador/eventos/c/editar");
      expect(edit.textContent).toBe("");
      expect(edit.className).toContain("size-11");
      expect(row.getByRole("button", { name: "Más acciones de Evento c" }).className).toContain("size-11");
      // Sin botones con texto en la fila.
      expect(row.queryByRole("button", { name: /^Eliminar/ })).toBeNull();

      const menu = await openRowMenu("Evento c");
      const items = menu.getAllByRole("menuitem");
      expect(items.map((item) => item.textContent)).toEqual(["Eliminar", "Enviar a revisión"]);
      for (const item of items) expect(item.className).toContain("min-h-11");
    });

    it("Eliminar desde el menú pide la misma confirmación", async () => {
      renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} canMutate />);

      fireEvent.click((await openRowMenu("Evento c")).getByRole("menuitem", { name: "Eliminar" }));
      const dialog = await screen.findByRole("alertdialog");
      expect(within(dialog).getByText("¿Eliminar el borrador «Evento c»?")).toBeTruthy();
      expect(deleteEventAction).not.toHaveBeenCalled();
    });

    it("un publicado sin acciones de menú (organizador) solo tiene [Editar], sin [•••]", () => {
      renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} canMutate />);
      const row = rowOf("Evento a");
      expect(row.getByRole("link", { name: "Editar Evento a" })).toBeTruthy();
      expect(row.queryByRole("button", { name: /^Más acciones/ })).toBeNull();
    });

    it("en revisión, un admin tiene [•••] con Aprobar y Rechazar y sin [Editar]", async () => {
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} canMutate role="admin" />);
      expect(rowOf("Evento b").queryByRole("link", { name: /^Editar/ })).toBeNull();

      const menu = await openRowMenu("Evento b");
      expect(menu.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Aprobar", "Rechazar", "Destacar"]);
    });

    it("publicado con ventas (admin): Cancelar evento deshabilitado con el motivo y no se ejecuta", async () => {
      const events = [makeEvent("a", { sold: 3, hasActiveSales: true })];
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={events} canMutate role="admin" />);

      const menu = await openRowMenu("Evento a");
      const cancel = menu.getByRole("menuitem", { name: "Cancelar evento" });
      expect(cancel.getAttribute("aria-disabled")).toBe("true");
      expect(document.getElementById(cancel.getAttribute("aria-describedby") ?? "")?.textContent).toBe(
        CANCEL_BLOCKED_REASON,
      );
      fireEvent.click(cancel);
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(cancelEventAction).not.toHaveBeenCalled();
    });

    it("las tarjetas (< lg) siguen con botones con texto y sin [•••]", () => {
      renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} canMutate />);
      const list = cards();
      expect(list.getByRole("link", { name: "Editar Evento c" }).textContent).toBe("Editar");
      expect(list.getByRole("button", { name: "Eliminar Evento c" }).textContent).toBe("Eliminar");
      expect(list.getByRole("button", { name: "Enviar a revisión Evento c" }).textContent).toBe("Enviar a revisión");
      expect(list.queryByRole("button", { name: /^Más acciones/ })).toBeNull();
    });
  });

  describe("destacar (admin)", () => {
    const cardOf = (title: string) => within(cards().getByRole("heading", { name: title }).closest("li") as HTMLElement);

    it.each(["admin", "super_admin"] as const)("%s puede destacar en todos los estados (tarjeta y menú)", async (role) => {
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} canMutate role={role} />);
      for (const title of ["Evento a", "Evento b", "Evento c", "Evento d", "Evento e"]) {
        const button = cardOf(title).getByRole("button", { name: `Destacar ${title}` });
        expect(button.getAttribute("aria-pressed")).toBe("false");
        expect(button.className).toContain("h-11");
      }
      // Cancelado: sin Editar, solo [•••] con Destacar.
      expect(rowOf("Evento d").queryByRole("link", { name: /^Editar/ })).toBeNull();
      const menu = await openRowMenu("Evento d");
      expect(menu.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Destacar"]);
    });

    it("un destacado ofrece «Quitar destacado» (pulsado)", async () => {
      const events = [makeEvent("a", { featured: true })];
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={events} canMutate role="admin" />);
      expect(cardOf("Evento a").getByRole("button", { name: "Quitar destacado Evento a" }).getAttribute("aria-pressed")).toBe(
        "true",
      );
      const menu = await openRowMenu("Evento a");
      expect(menu.getByRole("menuitem", { name: "Quitar destacado" })).toBeTruthy();
    });

    it("un organizador no ve la acción; sin canMutate, tampoco el admin", () => {
      const { unmount } = renderWithQuery(
        <OrganizerEventsList userId="user-1" initialEvents={EVENTS} canMutate role="organizer" />,
      );
      expect(screen.queryByRole("button", { name: /^Destacar/ })).toBeNull();
      unmount();
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} role="admin" />);
      expect(screen.queryByRole("button", { name: /^Destacar/ })).toBeNull();
    });

    it("destacar desde la tarjeta llama a la acción sin diálogo, avisa y recarga el listado", async () => {
      vi.mocked(setEventFeaturedAction).mockResolvedValue({ ok: true, featured: true });
      vi.mocked(listManagedEventsAction).mockResolvedValue(EVENTS);
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} canMutate role="admin" />);

      fireEvent.click(cardOf("Evento c").getByRole("button", { name: "Destacar Evento c" }));
      await waitFor(() => expect(screen.getByText("Evento destacado.")).toBeTruthy());
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(setEventFeaturedAction).toHaveBeenCalledWith("c", true);
      expect(listManagedEventsAction).toHaveBeenCalledWith({ status: "all", q: "", from: "", to: "" });
    });

    it("quitar destacado desde el menú de la tabla avisa", async () => {
      vi.mocked(setEventFeaturedAction).mockResolvedValue({ ok: true, featured: false });
      vi.mocked(listManagedEventsAction).mockResolvedValue(EVENTS);
      const events = [makeEvent("a", { featured: true })];
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={events} canMutate role="admin" />);

      fireEvent.click((await openRowMenu("Evento a")).getByRole("menuitem", { name: "Quitar destacado" }));
      await waitFor(() => expect(screen.getByText("Evento retirado de destacados.")).toBeTruthy());
      expect(setEventFeaturedAction).toHaveBeenCalledWith("a", false);
    });

    it("si falla, el aviso muestra el error", async () => {
      vi.mocked(setEventFeaturedAction).mockResolvedValue({
        ok: false,
        error: "El evento no existe o no tienes acceso a él.",
        code: "not_found",
      });
      vi.mocked(listManagedEventsAction).mockResolvedValue(EVENTS);
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} canMutate role="admin" />);

      fireEvent.click(cardOf("Evento a").getByRole("button", { name: "Destacar Evento a" }));
      await waitFor(() => expect(screen.getByText("El evento no existe o no tienes acceso a él.")).toBeTruthy());
    });
  });

  describe("aviso de guardado", () => {
    it("con saved=borrador dice que el borrador ya está en el listado y se puede cerrar", () => {
      renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} saved="borrador" />);

      expect(screen.getByText("Borrador guardado")).toBeTruthy();
      expect(
        screen.getByText("Está en el listado con el estado «Borrador». Aún no es visible para el público."),
      ).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
      expect(screen.queryByText("Borrador guardado")).toBeNull();
    });

    it("con saved=cambios dice que el evento publicado ya muestra los cambios", () => {
      renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} saved="cambios" />);
      expect(screen.getByText("Cambios guardados")).toBeTruthy();
      expect(screen.getByText("El evento publicado ya muestra los cambios.")).toBeTruthy();
    });

    it("sin saved no hay aviso", () => {
      renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} />);
      expect(screen.queryByText("Borrador guardado")).toBeNull();
    });
  });
});
