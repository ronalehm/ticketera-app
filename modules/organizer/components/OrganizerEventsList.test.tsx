import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listManagedEventsAction } from "../actions/managedEvents.actions";
import { makeManagedEvent as makeEvent } from "../data/managedEvents.mock";
import { OrganizerEventsList } from "./OrganizerEventsList";

vi.mock("../actions/managedEvents.actions", () => ({ listManagedEventsAction: vi.fn() }));

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
  vi.clearAllMocks();
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
});
