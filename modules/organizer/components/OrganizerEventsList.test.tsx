import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteEventAction } from "../actions/eventDrafts.actions";
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
const cards = () => within(screen.getByRole("list", { name: "Listado" }));

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

    expect(listManagedEventsAction).toHaveBeenCalledWith({ status: "pending_review", q: "" });
    await waitFor(() => expect(screen.getByText("1 evento")).toBeTruthy());
    expect(cards().getAllByRole("listitem")).toHaveLength(1);
  });

  it("busca al enviar el formulario, sin espacios sobrantes", async () => {
    vi.mocked(listManagedEventsAction).mockResolvedValue([]);
    renderWithQuery(<OrganizerEventsList role="organizer" userId="user-1" initialEvents={EVENTS} />);

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "  feria " } });
    expect(listManagedEventsAction).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByRole("search"));

    expect(listManagedEventsAction).toHaveBeenCalledWith({ status: "all", q: "feria" });
    await waitFor(() => expect(screen.getByText("No hay eventos con estos filtros.")).toBeTruthy());
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

    it("cancelado y finalizado no tienen acciones (ni el pie de acciones de la tarjeta)", () => {
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} canMutate role="admin" />);
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
      expect(listManagedEventsAction).toHaveBeenCalledWith({ status: "all", q: "" });
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

    it("con ventas, Cancelar evento queda deshabilitado con el motivo", () => {
      const events = [makeEvent("a", { sold: 3 })];
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={events} canMutate role="admin" />);
      const button = cardOf("Evento a").getByRole("button", { name: "Cancelar evento Evento a" });
      expect(button.getAttribute("aria-disabled") === "true" || button.hasAttribute("disabled")).toBe(true);
      const reason = document.getElementById(button.getAttribute("aria-describedby") ?? "");
      expect(reason?.textContent).toBe("Tiene ventas · Cancelación con reembolsos: Próximamente");
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
      expect(listManagedEventsAction).toHaveBeenCalledWith({ status: "all", q: "" });
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
