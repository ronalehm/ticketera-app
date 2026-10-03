import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getTodayInLima } from "../schemas/organizer.schema";

import { useOrganizerStore } from "../stores/organizer.store";
import { OrganizerEventForm } from "./OrganizerEventForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });
const row = (n: number) => within(screen.getByRole("group", { name: `Tipo ${n}` }));
const rowInput = (n: number, label: string) => row(n).getByLabelText(label) as HTMLInputElement;
const publishButton = () => screen.getByRole("button", { name: "Publicar evento" });
const draftButton = () => screen.getByRole("button", { name: "Guardar borrador" });
const addButton = () => screen.getByRole("button", { name: "Agregar tipo de entrada" });

function fillRow(n: number, name: string, price: string, quantity: string) {
  type(rowInput(n, "Nombre"), name);
  type(rowInput(n, "Precio (S/)"), price);
  type(rowInput(n, "Cantidad"), quantity);
}

function fillValid() {
  type(input("Nombre del evento"), "  Festival de verano  ");
  type(input("Descripción"), "Música en vivo todo el día.");
  type(input("Fecha"), "2030-01-01");
  type(input("Hora de inicio"), "20:00");
  type(input("Lugar"), "Estadio Nacional");
  type(input("Ciudad"), "Lima");
  fillRow(1, "General", "50", "100");
  fireEvent.click(addButton());
  fillRow(2, "VIP", "80", "50");
}

beforeEach(() => {
  useOrganizerStore.setState({ events: [] });
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("OrganizerEventForm", () => {
  it("'Publicar evento' vacío muestra todos los errores, enfoca 'Nombre del evento' y no navega", () => {
    render(<OrganizerEventForm />);
    fireEvent.click(publishButton());

    for (const message of [
      "Ingresa el nombre del evento",
      "Agrega una descripción del evento",
      "Elige la fecha del evento",
      "Indica la hora de inicio",
      "Indica el lugar del evento",
      "Indica la ciudad",
    ]) {
      expect(screen.getByText(message)).toBeTruthy();
    }
    for (const [label, message] of [
      ["Nombre", "Ingresa el nombre del tipo de entrada"],
      ["Precio (S/)", "Ingresa el precio"],
      ["Cantidad", "Ingresa la cantidad"],
    ]) {
      const field = rowInput(1, label);
      expect(field.getAttribute("aria-invalid")).toBe("true");
      expect(document.getElementById(field.getAttribute("aria-describedby")!)?.textContent).toBe(message);
    }
    expect(input("Nombre del evento").getAttribute("aria-invalid")).toBe("true");
    expect(input("Nombre del evento").getAttribute("aria-describedby")).toBe("organizer-event-name-error");
    expect(document.activeElement).toBe(input("Nombre del evento"));
    expect(push).not.toHaveBeenCalled();
    expect(useOrganizerStore.getState().events).toEqual([]);
  });

  it("'Guardar borrador' vacío solo muestra el error del nombre y no guarda", () => {
    render(<OrganizerEventForm />);
    fireEvent.click(draftButton());

    expect(screen.getByText("Ingresa el nombre del evento")).toBeTruthy();
    expect(screen.queryByText("Agrega una descripción del evento")).toBeNull();
    expect(screen.queryByText("Ingresa el precio")).toBeNull();
    expect(document.activeElement).toBe(input("Nombre del evento"));
    expect(push).not.toHaveBeenCalled();
    expect(useOrganizerStore.getState().events).toEqual([]);
  });

  it("'Guardar borrador' solo con el nombre guarda un borrador y navega con guardado=borrador", async () => {
    render(<OrganizerEventForm />);
    type(input("Nombre del evento"), "Mi borrador");
    fireEvent.click(draftButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=borrador"));
    const [event] = useOrganizerStore.getState().events;
    expect(event).toMatchObject({
      title: "Mi borrador",
      status: "draft",
      startsAt: null,
      priceFrom: null,
      capacity: 0,
      sold: 0,
      imageUrl: null,
    });
    expect(event.id).toMatch(/^org-/);
    expect(JSON.parse(localStorage.getItem("mentec-organizer-events")!).state.events).toHaveLength(1);
  });

  it("publicación válida guarda un evento publicado con la capacidad total y navega con guardado=publicado", async () => {
    render(<OrganizerEventForm />);
    fillValid();
    fireEvent.click(publishButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=publicado"));
    expect(useOrganizerStore.getState().events).toEqual([
      expect.objectContaining({
        title: "Festival de verano",
        category: "conciertos",
        startsAt: "2030-01-01T20:00:00-05:00",
        venue: "Estadio Nacional",
        city: "Lima",
        priceFrom: 50,
        capacity: 150,
        status: "published",
      }),
    ]);
  });

  it("muestra el error en el input concreto de la fila y desaparece al corregirlo y salir del campo", () => {
    render(<OrganizerEventForm />);
    fillValid();
    type(rowInput(2, "Precio (S/)"), "-5");
    fireEvent.click(publishButton());

    expect(rowInput(2, "Precio (S/)").getAttribute("aria-invalid")).toBe("true");
    expect(row(2).getByText("El precio debe ser 0 o mayor")).toBeTruthy();
    expect(rowInput(1, "Precio (S/)").getAttribute("aria-invalid")).toBe("false");
    expect(document.activeElement).toBe(rowInput(2, "Precio (S/)"));
    expect(push).not.toHaveBeenCalled();

    type(rowInput(2, "Precio (S/)"), "80");
    fireEvent.blur(rowInput(2, "Precio (S/)"));
    expect(screen.queryByText("El precio debe ser 0 o mayor")).toBeNull();
    expect(rowInput(2, "Precio (S/)").getAttribute("aria-invalid")).toBe("false");
  });

  it("gestiona las filas: quitar deshabilitado con una, foco al agregar y al quitar, y capacidad total", () => {
    render(<OrganizerEventForm />);
    const removeFirst = screen.getByRole("button", { name: "Quitar tipo de entrada 1" }) as HTMLButtonElement;
    expect(removeFirst.disabled).toBe(true);
    expect(screen.getByText("0 entradas")).toBeTruthy();

    type(rowInput(1, "Cantidad"), "1");
    expect(screen.getByText("1 entrada")).toBeTruthy();

    fireEvent.click(addButton());
    expect(screen.getByRole("group", { name: "Tipo 2" })).toBeTruthy();
    expect(document.activeElement).toBe(rowInput(2, "Nombre"));
    expect(removeFirst.disabled).toBe(false);

    type(rowInput(1, "Cantidad"), "100");
    type(rowInput(2, "Cantidad"), "50");
    expect(screen.getByText("150 entradas")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Quitar tipo de entrada 2" }));
    expect(screen.queryByRole("group", { name: "Tipo 2" })).toBeNull();
    expect(document.activeElement).toBe(addButton());
    expect(screen.getByText("100 entradas")).toBeTruthy();
  });

  it("la portada elegida se ve en el campo y en la vista previa, pero el evento se guarda con imageUrl: null", async () => {
    const createObjectURL = vi.fn(() => "blob:http://localhost/cover");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const { container } = render(<OrganizerEventForm />);

    const cover = new File(["png"], "portada.png", { type: "image/png" });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [cover] } });

    expect(createObjectURL).toHaveBeenCalledWith(cover);
    expect(screen.getByAltText("Vista previa de la imagen de portada").getAttribute("src")).toBe(
      "blob:http://localhost/cover",
    );
    const preview = within(screen.getByRole("complementary", { name: "Vista previa" }));
    expect(preview.getByRole("presentation", { hidden: true }).getAttribute("src")).toBe("blob:http://localhost/cover");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cambiar imagen" }));

    type(input("Nombre del evento"), "Con portada");
    fireEvent.click(draftButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=borrador"));
    expect(useOrganizerStore.getState().events[0]).toMatchObject({ title: "Con portada", imageUrl: null });
    expect(localStorage.getItem("mentec-organizer-events")).not.toContain("blob:");

    cleanup();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/cover");
    vi.unstubAllGlobals();
  });

  it("'Fecha' solo tiene min (hoy en Lima) en cliente: el HTML del servidor no lo incluye", () => {
    const serverHtml = renderToString(<OrganizerEventForm />);
    expect(serverHtml).toMatch(/<input[^>]*type="date"/);
    expect(serverHtml).not.toMatch(/<input[^>]*type="date"[^>]*min=/);

    render(<OrganizerEventForm />);
    expect(input("Fecha").getAttribute("min")).toBe(getTodayInLima());
  });
});
