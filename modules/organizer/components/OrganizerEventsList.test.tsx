import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteEventAction } from "../actions/eventDrafts.actions";
import { listManagedEventsAction } from "../actions/managedEvents.actions";
import { makeManagedEvent as makeEvent } from "../data/managedEvents.mock";
import { OrganizerEventsList } from "./OrganizerEventsList";

vi.mock("../actions/managedEvents.actions", () => ({ listManagedEventsAction: vi.fn() }));
vi.mock("../actions/eventDrafts.actions", () => ({ deleteEventAction: vi.fn() }));

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
    renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} />);

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
    renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} />);

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
    renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} />);

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "  feria " } });
    expect(listManagedEventsAction).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByRole("search"));

    expect(listManagedEventsAction).toHaveBeenCalledWith({ status: "all", q: "feria" });
    await waitFor(() => expect(screen.getByText("No hay eventos con estos filtros.")).toBeTruthy());
  });

  it("sin eventos lo dice", () => {
    renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={[]} />);
    expect(screen.getByText("Aún no tienes eventos.")).toBeTruthy();
  });

  it("si falla la carga lo anuncia", async () => {
    vi.mocked(listManagedEventsAction).mockRejectedValue(new Error("fallo"));
    renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} />);

    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "draft" } });
    expect((await screen.findByRole("alert")).textContent).toBe("No pudimos cargar los eventos. Inténtalo de nuevo.");
  });

  it("si falla la carga no dice que no hay eventos con esos filtros", async () => {
    vi.mocked(listManagedEventsAction).mockRejectedValue(new Error("fallo"));
    renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} />);

    fireEvent.change(screen.getByLabelText("Buscar"), { target: { value: "nada" } });
    fireEvent.submit(screen.getByRole("search"));
    await screen.findByRole("alert");
    expect(screen.queryByText("No hay eventos con estos filtros.")).toBeNull();
    expect(screen.queryByText("Aún no tienes eventos.")).toBeNull();
  });

  it("muestra el organizador de cada evento solo con showOrganizer (admin)", () => {
    const { unmount } = renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} />);
    expect(cards().queryByText(/Productora a/)).toBeNull();
    unmount();

    renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} showOrganizer />);
    expect(cards().getByText(/Productora a/)).toBeTruthy();
  });

  describe("acciones de borrador", () => {
    it("con canMutate, solo los borradores tienen Editar (enlace a su formulario) y Eliminar", () => {
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} canMutate />);

      const list = cards();
      expect(list.getAllByRole("link", { name: /^Editar/ })).toHaveLength(1);
      expect(list.getByRole("link", { name: "Editar Evento c" }).getAttribute("href")).toBe("/organizador/eventos/c/editar");
      expect(list.getAllByRole("button", { name: /^Eliminar/ })).toHaveLength(1);
      expect(list.getByRole("button", { name: "Eliminar Evento c" })).toBeTruthy();
      // La tabla (lg) tiene la columna de acciones.
      expect(screen.getByRole("columnheader", { name: "Acciones" })).toBeTruthy();
    });

    it("sin canMutate (solo lectura) no hay acciones", () => {
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} />);
      expect(screen.queryByRole("link", { name: /^Editar/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /^Eliminar/ })).toBeNull();
      expect(screen.queryByRole("columnheader", { name: "Acciones" })).toBeNull();
    });

    it("Eliminar pide confirmación, elimina, avisa y recarga el listado", async () => {
      vi.mocked(deleteEventAction).mockResolvedValue({ ok: true });
      vi.mocked(listManagedEventsAction).mockResolvedValue(EVENTS.filter((event) => event.id !== "c"));
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} canMutate />);

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
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} canMutate />);

      fireEvent.click(cards().getByRole("button", { name: "Eliminar Evento c" }));
      const dialog = await screen.findByRole("alertdialog");
      fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

      expect((await within(dialog).findByRole("alert")).textContent).toBe("Solo se pueden eliminar borradores.");
      expect(screen.queryByText(/eliminado$/)).toBeNull();
    });
  });

  describe("aviso de guardado", () => {
    it("con saved=borrador dice que el borrador ya está en el listado y se puede cerrar", () => {
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} saved="borrador" />);

      expect(screen.getByText("Borrador guardado")).toBeTruthy();
      expect(
        screen.getByText("Está en el listado con el estado «Borrador». Aún no es visible para el público."),
      ).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
      expect(screen.queryByText("Borrador guardado")).toBeNull();
    });

    it("sin saved no hay aviso", () => {
      renderWithQuery(<OrganizerEventsList userId="user-1" initialEvents={EVENTS} />);
      expect(screen.queryByText("Borrador guardado")).toBeNull();
    });
  });
});
