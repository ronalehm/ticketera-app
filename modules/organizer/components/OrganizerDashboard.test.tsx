import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listManagedEventsAction } from "../actions/managedEvents.actions";
import { makeManagedEvent } from "../data/managedEvents.mock";
import { OrganizerDashboard } from "./OrganizerDashboard";

vi.mock("../actions/managedEvents.actions", () => ({ listManagedEventsAction: vi.fn() }));
vi.mock("../actions/eventDrafts.actions", () => ({ deleteEventAction: vi.fn() }));
vi.mock("../actions/eventModeration.actions", () => ({
  submitForReviewAction: vi.fn(),
  approveEventAction: vi.fn(),
  rejectEventAction: vi.fn(),
  cancelEventAction: vi.fn(),
}));

const EVENTS = [
  makeManagedEvent("a", { sold: 30, revenueCents: 270_000 }),
  makeManagedEvent("b", { status: "pending_review" }),
  makeManagedEvent("c", { status: "draft", startsAt: null, capacity: 1500 }),
  makeManagedEvent("d", { status: "finished", sold: 10, revenueCents: 90_000 }),
];

function renderDashboard(props: Partial<React.ComponentProps<typeof OrganizerDashboard>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <OrganizerDashboard role="organizer" userId="user-1" initialEvents={EVENTS} {...props} />
    </QueryClientProvider>,
  );
}

/** Valor (`<dd>`) del KPI con esa etiqueta (`<dt>`). */
const kpi = (label: string) =>
  within(document.querySelector("dl")!).getByText(label).closest("div")?.querySelector("dd")?.textContent;

/** Lista de tarjetas (< lg); la tabla tiene las mismas filas. */
const cards = () => within(screen.getByRole("list", { name: "Mis eventos" }));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("OrganizerDashboard", () => {
  it("resume en los KPIs todos los eventos con las ventas de la BD, sin pedirlos otra vez", () => {
    renderDashboard();

    expect(kpi("Ingresos")).toBe("S/ 3,600.00");
    expect(kpi("Entradas vendidas")).toBe("40");
    expect(kpi("Eventos publicados")).toBe("1");
    expect(listManagedEventsAction).not.toHaveBeenCalled();
  });

  it("filtrar cambia el listado (en el servidor) pero no los KPIs", async () => {
    vi.mocked(listManagedEventsAction).mockResolvedValue([EVENTS[2]]);
    renderDashboard();

    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "draft" } });

    expect(listManagedEventsAction).toHaveBeenCalledTimes(1);
    expect(listManagedEventsAction).toHaveBeenCalledWith({ status: "draft", q: "", from: "", to: "" });
    await waitFor(() => expect(cards().getAllByRole("listitem")).toHaveLength(1));
    expect(kpi("Ingresos")).toBe("S/ 3,600.00");
    expect(kpi("Entradas vendidas")).toBe("40");
    expect(kpi("Eventos publicados")).toBe("1");
  });

  it("debajo de los KPIs muestra el listado con filtros y, con canMutate, las acciones de cada fila", () => {
    renderDashboard({ canMutate: true });

    expect(screen.getByRole("heading", { level: 2, name: "Mis eventos" })).toBeTruthy();
    expect(screen.getByRole("search")).toBeTruthy();
    expect(screen.getByLabelText("Desde")).toBeTruthy();
    expect(screen.getByLabelText("Hasta")).toBeTruthy();
    expect(cards().getByRole("link", { name: "Editar Evento c" }).getAttribute("href")).toBe(
      "/organizador/eventos/c/editar",
    );
    expect(cards().getByRole("button", { name: "Eliminar Evento c" })).toBeTruthy();
  });

  it("muestra «Crear evento» solo con canCreate (no es una cuenta en solo lectura)", () => {
    const { unmount } = renderDashboard({ canCreate: true });
    expect(screen.getByRole("link", { name: "Crear evento" }).getAttribute("href")).toBe("/organizador/eventos/nuevo");
    unmount();

    renderDashboard();
    expect(screen.queryByRole("link", { name: "Crear evento" })).toBeNull();
  });

  it("con saved muestra el aviso de guardado", () => {
    renderDashboard({ saved: "borrador" });
    expect(screen.getByText("Borrador guardado")).toBeTruthy();
  });

  it("sin eventos lo dice", () => {
    renderDashboard({ initialEvents: [] });
    expect(screen.getByText("Aún no tienes eventos.")).toBeTruthy();
  });
});
