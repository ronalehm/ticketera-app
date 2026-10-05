import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listManagedEventsAction } from "../actions/managedEvents.actions";
import { makeManagedEvent } from "../data/managedEvents.mock";
import { OrganizerDashboard } from "./OrganizerDashboard";

vi.mock("../actions/managedEvents.actions", () => ({ listManagedEventsAction: vi.fn() }));

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
      <OrganizerDashboard userId="user-1" initialEvents={EVENTS} {...props} />
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
  vi.clearAllMocks();
});

describe("OrganizerDashboard", () => {
  it("resume en los KPIs todos los eventos con las ventas de la BD, sin pedirlos otra vez", () => {
    renderDashboard();

    expect(kpi("Ingresos")).toBe("S/ 3,600.00");
    expect(kpi("Entradas vendidas")).toBe("40");
    expect(kpi("Eventos publicados")).toBe("1");
    expect(listManagedEventsAction).not.toHaveBeenCalled();
  });

  it("el filtro solo cambia la lista, en el cliente", () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Borradores" }));
    expect(cards().getAllByRole("listitem")).toHaveLength(1);
    expect(cards().getByText("Evento c")).toBeTruthy();
    expect(kpi("Eventos publicados")).toBe("1");
    expect(listManagedEventsAction).not.toHaveBeenCalled();
  });

  it("un borrador no muestra ingresos y el resto sí", () => {
    renderDashboard();

    const draft = cards().getByText("Evento c").closest("li")!;
    expect(within(draft).getByText("Sin ingresos")).toBeTruthy();
    const finished = cards().getByText("Evento d").closest("li")!;
    expect(within(finished).getByText("S/ 900.00")).toBeTruthy();
  });

  it("no tiene acciones por fila (se editan desde Mis eventos)", () => {
    renderDashboard();
    expect(screen.queryByRole("link", { name: /Editar/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Eliminar/ })).toBeNull();
  });

  it("sin eventos lo dice", () => {
    renderDashboard({ initialEvents: [] });
    expect(screen.getByText("Aún no tienes eventos.")).toBeTruthy();
  });
});
