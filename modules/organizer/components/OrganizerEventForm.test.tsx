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
const kindRadio = (n: number, name: "General (de pie)" | "Numerada") => row(n).getByRole("radio", { name });
const SEAT_HINT = "Indica las filas (1 a 30) y los asientos por fila (1 a 60) para ver el plano.";

function fillNumberedRow(n: number, name: string, price: string, rows: string, seatsPerRow: string) {
  type(rowInput(n, "Nombre"), name);
  type(rowInput(n, "Precio (S/)"), price);
  fireEvent.click(kindRadio(n, "Numerada"));
  type(rowInput(n, "Filas"), rows);
  type(rowInput(n, "Asientos por fila"), seatsPerRow);
}

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
    const { createObjectURL: originalCreate, revokeObjectURL: originalRevoke } = URL;
    const createObjectURL = vi.fn(() => "blob:http://localhost/cover");
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    try {
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
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });

  describe("asientos por zona", () => {
    it("cada tipo es un bloque con legend visible, etiquetas y 'Ubicación' con 'General (de pie)' por defecto", () => {
      const { container } = render(<OrganizerEventForm />);

      expect(
        screen.getByText("Cada tipo es una zona con su precio: general (de pie) o numerada (con filas y asientos)."),
      ).toBeTruthy();
      const block = screen.getByRole("group", { name: "Tipo 1" });
      expect(block.tagName).toBe("FIELDSET");
      expect(block.querySelector("legend")?.className).not.toContain("sr-only");
      for (const label of ["Nombre", "Precio (S/)", "Cantidad"]) {
        expect(row(1).getByText(label).className).not.toContain("sr-only");
      }
      expect(row(1).getByRole("radiogroup", { name: "Ubicación" })).toBeTruthy();
      expect(kindRadio(1, "General (de pie)").getAttribute("aria-checked")).toBe("true");
      expect(kindRadio(1, "Numerada").getAttribute("aria-checked")).toBe("false");
      expect(container.querySelector("form div[aria-hidden]")).toBeNull();
    });

    it("elegir 'Numerada' muestra Filas, Asientos por fila, Cantidad de solo lectura vacía y la ayuda del plano", () => {
      render(<OrganizerEventForm />);
      fireEvent.click(kindRadio(1, "Numerada"));

      expect(kindRadio(1, "Numerada").getAttribute("aria-checked")).toBe("true");
      expect(rowInput(1, "Filas").getAttribute("max")).toBe("30");
      expect(rowInput(1, "Asientos por fila").getAttribute("max")).toBe("60");
      const count = rowInput(1, "Cantidad");
      expect(count.readOnly).toBe(true);
      expect(count.value).toBe("");
      expect(count.placeholder).toBe("—");
      expect(document.getElementById(count.getAttribute("aria-describedby")!)?.textContent).toBe(
        "Filas × asientos por fila",
      );
      expect(row(1).getByText(SEAT_HINT)).toBeTruthy();
      expect(row(1).queryByRole("figure")).toBeNull();
    });

    it("con 10 × 20 calcula la Cantidad, dibuja el plano con su pie y suma a la capacidad total", () => {
      render(<OrganizerEventForm />);
      fillNumberedRow(1, "Platea", "120", "10", "20");

      expect(rowInput(1, "Cantidad").value).toBe("200");
      const figure = row(1).getByRole("figure");
      const plan = figure.querySelector("svg")!;
      expect(plan.querySelectorAll("circle")).toHaveLength(200);
      expect(plan.closest("[aria-hidden]")).toBeTruthy();
      expect(within(figure).getByText("Escenario").closest("[aria-hidden]")).toBeTruthy();
      expect(figure.querySelector("a, button, input, [tabindex]")).toBeNull();
      expect(figure.querySelector("figcaption")?.textContent).toBe("Filas A–J · 20 asientos por fila · S/ 120.00 c/u");
      expect(row(1).queryByText(SEAT_HINT)).toBeNull();
      expect(screen.getByText("200 entradas")).toBeTruthy();
    });

    it("publicar con una zona general y otra numerada válidas guarda la capacidad sumada", async () => {
      render(<OrganizerEventForm />);
      fillValid();
      fireEvent.click(screen.getByRole("button", { name: "Quitar tipo de entrada 2" }));
      fireEvent.click(addButton());
      fillNumberedRow(2, "Platea", "120", "10", "20");
      expect(screen.getByText("300 entradas")).toBeTruthy();
      fireEvent.click(publishButton());

      await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=publicado"));
      expect(useOrganizerStore.getState().events[0]).toMatchObject({ capacity: 300, priceFrom: 50, sold: 0 });
    });

    it("con Filas '31' publicar marca ese input, no dibuja el plano y el error desaparece al corregir y salir", () => {
      render(<OrganizerEventForm />);
      fillValid();
      fireEvent.click(kindRadio(2, "Numerada"));
      type(rowInput(2, "Filas"), "31");
      type(rowInput(2, "Asientos por fila"), "20");
      fireEvent.click(publishButton());

      const rowsInput = rowInput(2, "Filas");
      expect(rowsInput.getAttribute("aria-invalid")).toBe("true");
      expect(document.getElementById(rowsInput.getAttribute("aria-describedby")!)?.textContent).toBe(
        "Las filas deben ser un número entero entre 1 y 30",
      );
      expect(rowInput(2, "Asientos por fila").getAttribute("aria-invalid")).toBe("false");
      expect(row(2).getByText(SEAT_HINT)).toBeTruthy();
      expect(screen.getByText("100 entradas")).toBeTruthy();
      expect(push).not.toHaveBeenCalled();

      type(rowsInput, "10");
      fireEvent.blur(rowsInput);
      expect(screen.queryByText("Las filas deben ser un número entero entre 1 y 30")).toBeNull();
      expect(rowInput(2, "Filas").getAttribute("aria-invalid")).toBe("false");
      expect(row(2).getByRole("figure")).toBeTruthy();
    });

    it("una zona numerada vacía da un mensaje por campo y ninguno de 'Cantidad'", () => {
      render(<OrganizerEventForm />);
      fireEvent.click(kindRadio(1, "Numerada"));
      fireEvent.click(publishButton());

      for (const [label, message] of [
        ["Filas", "Ingresa el número de filas"],
        ["Asientos por fila", "Ingresa los asientos por fila"],
      ]) {
        const field = rowInput(1, label);
        expect(field.getAttribute("aria-invalid")).toBe("true");
        expect(document.getElementById(field.getAttribute("aria-describedby")!)?.textContent).toBe(message);
      }
      expect(screen.queryByText("Ingresa la cantidad")).toBeNull();
    });

    it("cambiar la ubicación conserva los valores y, tras publicar, revalida los errores del tipo elegido", () => {
      render(<OrganizerEventForm />);
      type(rowInput(1, "Cantidad"), "100");
      fireEvent.click(kindRadio(1, "Numerada"));
      fireEvent.click(publishButton());
      expect(screen.getByText("Ingresa el número de filas")).toBeTruthy();
      expect(screen.queryByText("Ingresa la cantidad")).toBeNull();
      expect(screen.queryByText("La cantidad debe ser un número entero mayor o igual a 1")).toBeNull();

      fireEvent.click(kindRadio(1, "General (de pie)"));
      expect(rowInput(1, "Cantidad").value).toBe("100");
      expect(rowInput(1, "Cantidad").getAttribute("aria-invalid")).toBe("false");
      expect(screen.queryByText("Ingresa el número de filas")).toBeNull();
      expect(screen.getByText("100 entradas")).toBeTruthy();
    });

    it("un borrador con Filas '500' se guarda con capacidad 0 y no dibuja el plano", async () => {
      render(<OrganizerEventForm />);
      type(input("Nombre del evento"), "Borrador con platea");
      fireEvent.click(kindRadio(1, "Numerada"));
      type(rowInput(1, "Filas"), "500");
      type(rowInput(1, "Asientos por fila"), "20");
      expect(row(1).getByText(SEAT_HINT)).toBeTruthy();
      expect(row(1).queryByRole("figure")).toBeNull();
      fireEvent.click(draftButton());

      await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=borrador"));
      expect(useOrganizerStore.getState().events[0]).toMatchObject({ capacity: 0, status: "draft" });
    });
  });

  it("'Fecha' solo tiene min (hoy en Lima) en cliente: el HTML del servidor no lo incluye", () => {
    const serverHtml = renderToString(<OrganizerEventForm />);
    expect(serverHtml).toMatch(/<input[^>]*type="date"/);
    expect(serverHtml).not.toMatch(/<input[^>]*type="date"[^>]*min=/);

    render(<OrganizerEventForm />);
    expect(input("Fecha").getAttribute("min")).toBe(getTodayInLima());
  });
});
