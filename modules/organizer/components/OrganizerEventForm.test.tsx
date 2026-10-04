import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getTodayInLima } from "../schemas/organizer.schema";

import { useOrganizerStore } from "../stores/organizer.store";
import { OrganizerEventForm } from "./OrganizerEventForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

type SeatingModeLabel = "Sin asientos numerados" | "Con mapa de asientos" | "Mixto";

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });
const row = (n: number) => within(screen.getByRole("group", { name: `Tipo ${n}` }));
const rowInput = (n: number, label: string) => row(n).getByLabelText(label) as HTMLInputElement;
const publishButton = () => screen.getByRole("button", { name: "Publicar evento" });
const draftButton = () => screen.getByRole("button", { name: "Guardar borrador" });
const addButton = () => screen.getByRole("button", { name: "Agregar tipo de entrada" });
const kindRadio = (n: number, name: "General (de pie)" | "Numerada") => row(n).getByRole("radio", { name });
const modeGroup = () => screen.getByRole("radiogroup", { name: "¿Cómo se ubica el público?" });
const modeRadio = (name: SeatingModeLabel) => within(modeGroup()).getByRole("radio", { name });
const chooseMode = (name: SeatingModeLabel) => fireEvent.click(modeRadio(name));
const citySelect = () => screen.getByRole("combobox", { name: "Ciudad" });
const selectText = (combobox: HTMLElement) => combobox.querySelector("[data-slot=select-value]")?.textContent;
const coverInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!;
const coverPreview = () => screen.queryByAltText("Vista previa de la imagen de portada");
const describedTexts = (element: HTMLElement) =>
  (element.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent);

// "Elige la ciudad" es también el placeholder del Select: el error se busca por su id.
const cityError = () => document.getElementById("organizer-event-city-error");
const SEAT_HINT = "Indica las filas (1 a 30) y los asientos por fila (1 a 60) para ver el plano.";
const MODE_HINT = "Elige arriba cómo se ubica el público para configurar los tipos de entrada.";
const MIXED_ERROR = "Un evento mixto necesita al menos una zona general (de pie) y una numerada";
const MAX_RANGE_ERROR = "El máximo por compra debe ser un número entero entre 1 y 10";
const COVER_REQUIRED = "Sube la imagen de portada";
const CROP_CAPTIONS = [
  "Página del evento · móvil",
  "Página del evento · escritorio",
  "Listado de eventos",
  "Inicio · escritorio",
  "Inicio · móvil",
];

// jsdom no implementa createImageBitmap ni URL.createObjectURL: el tamaño de la imagen y la URL local se simulan.
const bitmapClose = vi.fn();
const createImageBitmapMock = vi.fn();
const { createObjectURL: originalCreateObjectURL, revokeObjectURL: originalRevokeObjectURL } = URL;
const createObjectURL = vi.fn((file: File) => `blob:http://localhost/${file.name}`);
const revokeObjectURL = vi.fn();

function imageFile(name: string, { type = "image/png", width = 1920, height = 1080, size = 1024 } = {}) {
  const file = new File(["img"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  // El mock lee el tamaño del propio archivo.
  Object.assign(file, { testSize: { width, height } });
  return file;
}

function uploadCover(file: File) {
  fireEvent.change(coverInput(), { target: { files: [file] } });
}

async function uploadValidCover(name = "portada.png") {
  uploadCover(imageFile(name));
  await waitFor(() => expect(coverPreview()?.getAttribute("src")).toBe(`blob:http://localhost/${name}`));
}

/** Elige una opción del `Select` ya abierto. */
async function pickOption(combobox: HTMLElement, name: string) {
  const option = await screen.findByRole("option", { name });
  // Base UI solo acepta el clic de ratón que empezó sobre la opción.
  fireEvent.pointerDown(option, { pointerType: "mouse" });
  fireEvent.click(option);
  await waitFor(() => expect(selectText(combobox)).toBe(name));
}

async function chooseOption(combobox: HTMLElement, name: string) {
  fireEvent.click(combobox);
  await pickOption(combobox, name);
}

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

/** Formulario válido para publicar: "Sin asientos numerados" con dos zonas generales, ciudad Lima y portada. */
async function fillValid() {
  type(input("Nombre del evento"), "  Festival de verano  ");
  type(input("Descripción"), "Música en vivo todo el día.");
  type(input("Organizador"), "Pulso Producciones");
  type(input("Fecha"), "2030-01-01");
  type(input("Hora de inicio"), "20:00");
  type(input("Apertura de puertas"), "18:00");
  type(input("Lugar"), "Estadio Nacional");
  await chooseOption(citySelect(), "Lima");
  type(input("Dirección"), "Av. José Díaz s/n, Cercado de Lima");
  await uploadValidCover();
  chooseMode("Sin asientos numerados");
  fillRow(1, "General", "50", "100");
  type(rowInput(1, "Descripción (opcional)"), "Campo de pie, sin ubicación asignada.");
  fireEvent.click(addButton());
  fillRow(2, "VIP", "80", "50");
}

beforeEach(() => {
  useOrganizerStore.setState({ events: [] });
  localStorage.clear();
  createImageBitmapMock.mockImplementation(async (file: File & { testSize?: { width: number; height: number } }) => ({
    ...(file.testSize ?? { width: 1920, height: 1080 }),
    close: bitmapClose,
  }));
  vi.stubGlobal("createImageBitmap", createImageBitmapMock);
  URL.createObjectURL = createObjectURL;
  URL.revokeObjectURL = revokeObjectURL;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
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
      COVER_REQUIRED,
      "Elige cómo se ubica el público",
    ]) {
      expect(screen.getByText(message)).toBeTruthy();
    }
    expect(cityError()?.textContent).toBe("Elige la ciudad");
    expect(screen.queryByText("Indica la ciudad")).toBeNull();
    expect(modeGroup().getAttribute("aria-invalid")).toBe("true");
    expect(modeGroup().getAttribute("aria-describedby")).toBe("organizer-event-seatingMode-error");
    expect(document.getElementById("organizer-event-seatingMode-error")?.textContent).toBe(
      "Elige cómo se ubica el público",
    );
    expect(citySelect().getAttribute("aria-invalid")).toBe("true");
    expect(describedTexts(citySelect())).toEqual(["Elige la ciudad"]);
    expect(coverInput().getAttribute("aria-invalid")).toBe("true");
    expect(describedTexts(coverInput())).toContain(COVER_REQUIRED);
    expect(input("Nombre del evento").getAttribute("aria-invalid")).toBe("true");
    expect(input("Nombre del evento").getAttribute("aria-describedby")).toBe("organizer-event-name-error");
    expect(document.activeElement).toBe(input("Nombre del evento"));
    expect(push).not.toHaveBeenCalled();
    expect(useOrganizerStore.getState().events).toEqual([]);

    // Las filas siguen en el estado sin modo: al elegirlo aparecen con sus errores.
    chooseMode("Sin asientos numerados");
    expect(screen.queryByText("Elige cómo se ubica el público")).toBeNull();
    for (const [label, message] of [
      ["Nombre", "Ingresa el nombre del tipo de entrada"],
      ["Precio (S/)", "Ingresa el precio"],
      ["Cantidad", "Ingresa la cantidad"],
    ]) {
      const field = rowInput(1, label);
      expect(field.getAttribute("aria-invalid")).toBe("true");
      expect(document.getElementById(field.getAttribute("aria-describedby")!)?.textContent).toBe(message);
    }
  });

  it("'Guardar borrador' vacío solo muestra el error del nombre y no guarda", () => {
    render(<OrganizerEventForm />);
    fireEvent.click(draftButton());

    expect(screen.getByText("Ingresa el nombre del evento")).toBeTruthy();
    expect(screen.queryByText("Agrega una descripción del evento")).toBeNull();
    expect(screen.queryByText("Ingresa el precio")).toBeNull();
    expect(screen.queryByText("Indica el nombre del organizador")).toBeNull();
    expect(screen.queryByText("Indica la hora de apertura de puertas")).toBeNull();
    expect(screen.queryByText("Indica la dirección del lugar")).toBeNull();
    expect(document.activeElement).toBe(input("Nombre del evento"));
    expect(push).not.toHaveBeenCalled();
    expect(useOrganizerStore.getState().events).toEqual([]);
  });

  it("'Guardar borrador' solo con el nombre guarda un borrador sin errores de modo, ciudad, portada ni filas", async () => {
    render(<OrganizerEventForm />);
    type(input("Nombre del evento"), "Mi borrador");
    fireEvent.click(draftButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=borrador"));
    for (const message of ["Elige cómo se ubica el público", COVER_REQUIRED]) {
      expect(screen.queryByText(message)).toBeNull();
    }
    expect(cityError()).toBeNull();
    const [event] = useOrganizerStore.getState().events;
    expect(event).toMatchObject({
      title: "Mi borrador",
      status: "draft",
      startsAt: null,
      city: "",
      priceFrom: null,
      capacity: 0,
      sold: 0,
      imageUrl: null,
    });
    expect(event.id).toMatch(/^org-/);
    expect(JSON.parse(localStorage.getItem("mentec-organizer-events")!).state.events).toHaveLength(1);
  });

  it("un borrador con 'Máximo por compra' y descripción no válidos se guarda sin errores", async () => {
    render(<OrganizerEventForm />);
    type(input("Nombre del evento"), "Borrador con fila");
    chooseMode("Sin asientos numerados");
    type(rowInput(1, "Máximo por compra"), "0");
    type(rowInput(1, "Descripción (opcional)"), "x".repeat(151));
    fireEvent.click(draftButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=borrador"));
    expect(rowInput(1, "Máximo por compra").getAttribute("aria-invalid")).toBe("false");
    expect(rowInput(1, "Descripción (opcional)").getAttribute("aria-invalid")).toBe("false");
  });

  it("publicación válida guarda un evento publicado con la capacidad total y navega con guardado=publicado", async () => {
    render(<OrganizerEventForm />);
    await fillValid();
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

  it("muestra el error en el input concreto de la fila y desaparece al corregirlo y salir del campo", async () => {
    render(<OrganizerEventForm />);
    await fillValid();
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
    chooseMode("Sin asientos numerados");
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

  describe("modo de ubicación", () => {
    it("sin modo: sección 'Mapa de asientos' con tres opciones sin marcar y 'Tipos de entrada' solo con la indicación", () => {
      render(<OrganizerEventForm />);

      const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
      expect(headings.indexOf("Mapa de asientos")).toBe(headings.indexOf("Imagen de portada") + 1);
      expect(headings.indexOf("Tipos de entrada")).toBe(headings.indexOf("Mapa de asientos") + 1);
      expect(
        screen.getByText(
          "Define si quien compra elegirá su asiento en un plano. De esto depende cómo configuras los tipos de entrada.",
        ),
      ).toBeTruthy();
      expect(screen.getByText("Cada tipo de entrada es una zona con su precio y su capacidad.")).toBeTruthy();

      const radios = within(modeGroup()).getAllByRole("radio");
      expect(radios.map((radio) => radio.getAttribute("aria-checked"))).toEqual(["false", "false", "false"]);
      expect(radios.map((radio) => describedTexts(radio)[0])).toEqual([
        "Todas las zonas son generales (de pie). Quien compra elige cuántas entradas quiere.",
        "Todas las zonas tienen filas y asientos. Quien compra elige su asiento en el plano.",
        "Zonas de pie y zonas numeradas, como campo y tribunas. Quien compra elige asiento solo en las numeradas.",
      ]);
      expect(modeGroup().className).toContain("md:grid-cols-3");
      expect(modeGroup().getAttribute("aria-invalid")).toBe("false");

      expect(screen.getByText(MODE_HINT)).toBeTruthy();
      expect(screen.queryByRole("group", { name: "Tipo 1" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Agregar tipo de entrada" })).toBeNull();
      expect(screen.queryByText("Capacidad total")).toBeNull();
    });

    it("'Sin asientos numerados' oculta 'Ubicación', muestra 'Cantidad' y la fila nueva es general", () => {
      render(<OrganizerEventForm />);
      chooseMode("Sin asientos numerados");

      expect(modeRadio("Sin asientos numerados").getAttribute("aria-checked")).toBe("true");
      expect(screen.queryByText(MODE_HINT)).toBeNull();
      expect(row(1).queryByRole("radiogroup", { name: "Ubicación" })).toBeNull();
      expect(rowInput(1, "Cantidad").readOnly).toBe(false);

      fireEvent.click(addButton());
      expect(row(2).queryByRole("radiogroup", { name: "Ubicación" })).toBeNull();
      expect(rowInput(2, "Cantidad").readOnly).toBe(false);
      expect(row(2).queryByLabelText("Filas")).toBeNull();
    });

    it("'Con mapa de asientos' oculta 'Ubicación', muestra Filas, Asientos y Cantidad de solo lectura, y la fila nueva es numerada", () => {
      render(<OrganizerEventForm />);
      chooseMode("Con mapa de asientos");

      expect(row(1).queryByRole("radiogroup", { name: "Ubicación" })).toBeNull();
      expect(rowInput(1, "Filas")).toBeTruthy();
      expect(rowInput(1, "Asientos por fila")).toBeTruthy();
      expect(rowInput(1, "Cantidad").readOnly).toBe(true);
      expect(row(1).getByText(SEAT_HINT)).toBeTruthy();

      fireEvent.click(addButton());
      expect(row(2).queryByRole("radiogroup", { name: "Ubicación" })).toBeNull();
      expect(rowInput(2, "Filas")).toBeTruthy();
      expect(rowInput(2, "Cantidad").readOnly).toBe(true);
    });

    it("'Mixto' muestra 'Ubicación' en cada fila y la fila nueva es general", () => {
      render(<OrganizerEventForm />);
      chooseMode("Mixto");

      expect(row(1).getByRole("radiogroup", { name: "Ubicación" })).toBeTruthy();
      fireEvent.click(addButton());
      expect(row(2).getByRole("radiogroup", { name: "Ubicación" })).toBeTruthy();
      expect(kindRadio(2, "General (de pie)").getAttribute("aria-checked")).toBe("true");
    });

    it("cambiar de modo conserva los valores: la Cantidad 100 sigue tras pasar por 'Con mapa de asientos'", () => {
      render(<OrganizerEventForm />);
      chooseMode("Sin asientos numerados");
      type(rowInput(1, "Cantidad"), "100");

      chooseMode("Con mapa de asientos");
      type(rowInput(1, "Filas"), "10");
      expect(row(1).queryByLabelText("Cantidad")).toBeTruthy();
      expect(rowInput(1, "Cantidad").readOnly).toBe(true);

      chooseMode("Sin asientos numerados");
      expect(rowInput(1, "Cantidad").value).toBe("100");
      expect(screen.getByText("100 entradas")).toBeTruthy();

      chooseMode("Con mapa de asientos");
      expect(rowInput(1, "Filas").value).toBe("10");
    });

    it("'Mixto' con solo zonas generales marca el selector, lo enfoca, no navega y se corrige al numerar una zona", async () => {
      render(<OrganizerEventForm />);
      await fillValid();
      chooseMode("Mixto");
      fireEvent.click(publishButton());

      expect(modeGroup().getAttribute("aria-invalid")).toBe("true");
      expect(describedTexts(modeGroup())).toEqual([MIXED_ERROR]);
      expect(document.activeElement).toBe(modeGroup());
      expect(push).not.toHaveBeenCalled();

      fireEvent.click(kindRadio(2, "Numerada"));
      expect(screen.queryByText(MIXED_ERROR)).toBeNull();
      expect(modeGroup().getAttribute("aria-invalid")).toBe("false");
      type(rowInput(2, "Filas"), "10");
      type(rowInput(2, "Asientos por fila"), "20");
      fireEvent.click(publishButton());

      await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=publicado"));
      expect(useOrganizerStore.getState().events[0]).toMatchObject({ capacity: 300 });
    });

    it("quitar la única zona numerada en 'Mixto' vuelve a mostrar el error del selector", async () => {
      render(<OrganizerEventForm />);
      await fillValid();
      chooseMode("Mixto");
      fillNumberedRow(2, "Platea", "120", "10", "20");
      fireEvent.click(publishButton());
      await waitFor(() => expect(push).toHaveBeenCalled());
      push.mockClear();

      fireEvent.click(screen.getByRole("button", { name: "Quitar tipo de entrada 2" }));
      expect(screen.getByText(MIXED_ERROR)).toBeTruthy();
    });
  });

  describe("ciudad", () => {
    it("es un desplegable con 'Elige la ciudad' y las 5 ciudades; la elegida aparece en la vista previa", async () => {
      render(<OrganizerEventForm />);
      expect(citySelect().id).toBe("organizer-event-city");
      expect(selectText(citySelect())).toBe("Elige la ciudad");

      fireEvent.click(citySelect());
      const options = await screen.findAllByRole("option");
      expect(options.map((option) => option.textContent)).toEqual(["Lima", "Arequipa", "Cusco", "Trujillo", "Piura"]);
      expect(options.some((option) => option.getAttribute("aria-selected") === "true")).toBe(false);
      await pickOption(citySelect(), "Arequipa");

      type(input("Lugar"), "Estadio Nacional");
      const preview = within(screen.getByRole("complementary", { name: "Vista previa" }));
      expect(preview.getByText("Estadio Nacional · Arequipa")).toBeTruthy();
    });

    it("tras publicar sin ciudad, elegir una quita el error", async () => {
      render(<OrganizerEventForm />);
      fireEvent.click(publishButton());
      expect(cityError()?.textContent).toBe("Elige la ciudad");

      await chooseOption(citySelect(), "Lima");
      await waitFor(() => expect(cityError()).toBeNull());
      expect(citySelect().getAttribute("aria-invalid")).toBe("false");
    });
  });

  describe("descripción y máximo por compra", () => {
    it("van tras 'Nombre | Precio' con su ayuda, el máximo vale 10 y 'Ubicación' va después", () => {
      render(<OrganizerEventForm />);
      chooseMode("Mixto");

      const description = rowInput(1, "Descripción (opcional)");
      const max = rowInput(1, "Máximo por compra");
      expect(description.placeholder).toBe("Ej. Campo de pie, sin ubicación asignada.");
      expect(description.maxLength).toBe(150);
      expect(describedTexts(description)).toEqual(["Se muestra bajo el nombre al elegir entradas."]);
      expect(max.value).toBe("10");
      expect([max.type, max.inputMode, max.min, max.max, max.step]).toEqual(["number", "numeric", "1", "10", "1"]);
      expect(describedTexts(max)).toEqual(["Entradas de este tipo en una misma compra (1 a 10)."]);
      expect(description.id).toMatch(/^ticket-type-.+-description$/);
      expect(max.id).toMatch(/^ticket-type-.+-maxPerOrder$/);

      const ordered = [
        rowInput(1, "Nombre"),
        rowInput(1, "Precio (S/)"),
        description,
        max,
        kindRadio(1, "General (de pie)"),
        rowInput(1, "Cantidad"),
      ];
      for (let i = 1; i < ordered.length; i++) {
        expect(ordered[i - 1].compareDocumentPosition(ordered[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
      expect(description.parentElement?.parentElement?.className).toContain("md:grid-cols-[minmax(0,1fr)_160px]");
    });

    it.each([
      ["0", MAX_RANGE_ERROR],
      ["11", MAX_RANGE_ERROR],
      ["2.5", MAX_RANGE_ERROR],
      ["", "Ingresa el máximo por compra"],
    ])("con Máximo '%s' publicar marca ese input con '%s'", async (value, message) => {
      render(<OrganizerEventForm />);
      await fillValid();
      type(rowInput(2, "Máximo por compra"), value);
      fireEvent.click(publishButton());

      const max = rowInput(2, "Máximo por compra");
      expect(max.getAttribute("aria-invalid")).toBe("true");
      expect(describedTexts(max)).toEqual(["Entradas de este tipo en una misma compra (1 a 10).", message]);
      expect(rowInput(1, "Máximo por compra").getAttribute("aria-invalid")).toBe("false");
      expect(document.activeElement).toBe(max);
      expect(push).not.toHaveBeenCalled();
    });

    it("una descripción de más de 150 caracteres da error al publicar", async () => {
      render(<OrganizerEventForm />);
      await fillValid();
      // `change` no respeta `maxLength`: simula un valor pegado más largo.
      type(rowInput(2, "Descripción (opcional)"), "x".repeat(151));
      fireEvent.click(publishButton());

      const description = rowInput(2, "Descripción (opcional)");
      expect(description.getAttribute("aria-invalid")).toBe("true");
      expect(describedTexts(description)).toContain("La descripción debe tener como máximo 150 caracteres");
      expect(push).not.toHaveBeenCalled();
    });
  });

  describe("imagen de portada", () => {
    it("muestra la ayuda de la zona de subida y la guía del centro", () => {
      render(<OrganizerEventForm />);

      expect(describedTexts(coverInput())).toEqual([
        "JPG o PNG, hasta 5 MB. Recomendado: 1920 × 1080 px (16:9); mínimo 1200 × 675 px.",
      ]);
      expect(
        screen.getByText(
          "Es la imagen principal de la página de tu evento. Deja lo importante (rostros, texto, logo) en el centro: cada pantalla la recorta de forma distinta.",
        ),
      ).toBeTruthy();
      expect(screen.queryByText("Así se recorta tu portada")).toBeNull();
    });

    it("la portada válida se ve en el campo, en la vista previa y en los 5 recortes, pero se guarda con imageUrl: null", async () => {
      render(<OrganizerEventForm />);
      await uploadValidCover();

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(bitmapClose).toHaveBeenCalled();
      const preview = within(screen.getByRole("complementary", { name: "Vista previa" }));
      expect(preview.getByRole("presentation", { hidden: true }).getAttribute("src")).toBe(
        "blob:http://localhost/portada.png",
      );
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cambiar imagen" }));

      expect(screen.getByRole("heading", { level: 3, name: "Así se recorta tu portada" })).toBeTruthy();
      const figures = screen.getAllByRole("figure");
      expect(figures.map((figure) => figure.querySelector("figcaption")?.textContent)).toEqual(CROP_CAPTIONS);
      expect(figures.map((figure) => figure.querySelector("img")?.getAttribute("src"))).toEqual(
        Array(5).fill("blob:http://localhost/portada.png"),
      );
      expect(figures.map((figure) => figure.querySelector("img")?.getAttribute("alt"))).toEqual(Array(5).fill(""));
      expect(figures.map((figure) => figure.querySelector("img")?.parentElement?.className)).toEqual([
        expect.stringContaining("aspect-[16/9]"),
        expect.stringContaining("aspect-[4/3]"),
        expect.stringContaining("aspect-[2/1]"),
        expect.stringContaining("aspect-[21/8]"),
        expect.stringContaining("aspect-[4/5]"),
      ]);
      expect(figures[3].className).toContain("col-span-2");
      expect(
        screen.getByText("Los recortes de «Inicio» solo se usan si Mentec destaca tu evento en la portada."),
      ).toBeTruthy();

      type(input("Nombre del evento"), "Con portada");
      fireEvent.click(draftButton());

      await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=borrador"));
      expect(useOrganizerStore.getState().events[0]).toMatchObject({ title: "Con portada", imageUrl: null });
      expect(localStorage.getItem("mentec-organizer-events")).not.toContain("blob:");

      cleanup();
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:http://localhost/portada.png");
    });

    it.each([
      ["un GIF", imageFile("animada.gif", { type: "image/gif" }), "Sube una imagen en formato JPG o PNG."],
      [
        "un JPG de 6 MB",
        imageFile("pesada.jpg", { type: "image/jpeg", size: 6 * 1024 * 1024 }),
        "La imagen pesa más de 5 MB. Sube una más liviana.",
      ],
      ["un PNG de 800 × 600", imageFile("chica.png", { width: 800, height: 600 }), "La imagen debe medir al menos 1200 × 675 px."],
    ])("%s muestra su error y conserva la imagen anterior", async (_, file, message) => {
      render(<OrganizerEventForm />);
      await uploadValidCover("anterior.png");

      uploadCover(file);
      expect(await screen.findByText(message)).toBeTruthy();
      expect(coverPreview()?.getAttribute("src")).toBe("blob:http://localhost/anterior.png");
      expect(screen.getAllByRole("figure")).toHaveLength(5);
      expect(createObjectURL).toHaveBeenCalledTimes(1);
    });

    it("una imagen que no se puede leer muestra su error", async () => {
      createImageBitmapMock.mockRejectedValueOnce(new Error("decode"));
      render(<OrganizerEventForm />);
      uploadCover(imageFile("rota.png"));

      expect(await screen.findByText("No se pudo leer la imagen. Prueba con otro archivo.")).toBeTruthy();
      expect(coverPreview()).toBeNull();
    });

    it("al publicar sin portada pide subirla; el error de archivo tiene prioridad y una portada válida lo quita", async () => {
      render(<OrganizerEventForm />);
      fireEvent.click(publishButton());
      expect(screen.getByText(COVER_REQUIRED)).toBeTruthy();

      uploadCover(imageFile("animada.gif", { type: "image/gif" }));
      expect(await screen.findByText("Sube una imagen en formato JPG o PNG.")).toBeTruthy();
      expect(screen.queryByText(COVER_REQUIRED)).toBeNull();

      await uploadValidCover();
      expect(screen.queryByText("Sube una imagen en formato JPG o PNG.")).toBeNull();
      expect(screen.queryByText(COVER_REQUIRED)).toBeNull();
    });

    it("al quitar la imagen y publicar aparece 'Sube la imagen de portada' en la zona de subida", async () => {
      render(<OrganizerEventForm />);
      await fillValid();
      fireEvent.click(screen.getByRole("button", { name: "Quitar imagen" }));
      expect(screen.queryByText("Así se recorta tu portada")).toBeNull();
      fireEvent.click(publishButton());

      expect(coverInput().getAttribute("aria-invalid")).toBe("true");
      expect(describedTexts(coverInput())).toContain(COVER_REQUIRED);
      expect(document.activeElement).toBe(coverInput());
      expect(push).not.toHaveBeenCalled();
    });
  });

  describe("asientos por zona", () => {
    it("en 'Mixto' cada tipo es un bloque con legend visible, etiquetas y 'Ubicación' con 'General (de pie)' por defecto", () => {
      const { container } = render(<OrganizerEventForm />);
      chooseMode("Mixto");

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
      chooseMode("Mixto");
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
      chooseMode("Mixto");
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
      await fillValid();
      chooseMode("Mixto");
      fireEvent.click(screen.getByRole("button", { name: "Quitar tipo de entrada 2" }));
      fireEvent.click(addButton());
      fillNumberedRow(2, "Platea", "120", "10", "20");
      expect(screen.getByText("300 entradas")).toBeTruthy();
      fireEvent.click(publishButton());

      await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=publicado"));
      expect(useOrganizerStore.getState().events[0]).toMatchObject({ capacity: 300, priceFrom: 50, sold: 0 });
    });

    it("con Filas '31' publicar marca ese input, no dibuja el plano y el error desaparece al corregir y salir", async () => {
      render(<OrganizerEventForm />);
      await fillValid();
      chooseMode("Mixto");
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
      chooseMode("Con mapa de asientos");
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
      chooseMode("Mixto");
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
      chooseMode("Con mapa de asientos");
      type(rowInput(1, "Filas"), "500");
      type(rowInput(1, "Asientos por fila"), "20");
      expect(row(1).getByText(SEAT_HINT)).toBeTruthy();
      expect(row(1).queryByRole("figure")).toBeNull();
      fireEvent.click(draftButton());

      await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=borrador"));
      expect(useOrganizerStore.getState().events[0]).toMatchObject({ capacity: 0, status: "draft" });
    });
  });

  describe("datos del evento público", () => {
    const DOORS_ORDER_ERROR = "La apertura de puertas debe ser a la hora de inicio o antes";
    const ageSelect = () => screen.getByRole("combobox", { name: "Edad mínima" });

    it("muestra Edad mínima junto a Categoría, Organizador tras Descripción y Apertura y Dirección en Fecha y lugar", () => {
      render(<OrganizerEventForm />);

      expect(selectText(ageSelect())).toBe("Todo público");
      expect(ageSelect().parentElement?.parentElement).toBe(
        screen.getByRole("combobox", { name: "Categoría" }).parentElement?.parentElement,
      );
      expect(ageSelect().parentElement?.parentElement?.className).toContain("md:grid-cols-2");

      const fields = ["Descripción", "Organizador"].map(input);
      expect(fields[0].compareDocumentPosition(fields[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(document.getElementById(input("Organizador").getAttribute("aria-describedby")!)?.textContent).toBe(
        "Aparece en la página del evento como «Organiza: …».",
      );
      expect(input("Organizador").maxLength).toBe(100);
      expect(input("Organizador").placeholder).toBe("Ej. Pulso Producciones");

      const doorsOpen = input("Apertura de puertas");
      expect(doorsOpen.type).toBe("time");
      const timeGrid = doorsOpen.parentElement?.parentElement;
      expect(timeGrid).toBe(input("Fecha").parentElement?.parentElement);
      expect(timeGrid?.className).toContain("md:grid-cols-3");

      const address = input("Dirección");
      expect(address.maxLength).toBe(150);
      expect(address.placeholder).toBe("Ej. Av. José Díaz s/n, Cercado de Lima");
      expect(citySelect().compareDocumentPosition(address) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("'Edad mínima' ofrece las 5 opciones y guarda la elegida", async () => {
      render(<OrganizerEventForm />);
      fireEvent.click(ageSelect());

      const options = await screen.findAllByRole("option");
      expect(options.map((option) => option.textContent)).toEqual(["Todo público", "+12", "+14", "+16", "+18"]);
      await pickOption(ageSelect(), "+18");
    });

    it("publicar vacío muestra los errores de organizador, apertura de puertas y dirección en sus campos", () => {
      render(<OrganizerEventForm />);
      fireEvent.click(publishButton());

      for (const [label, message] of [
        ["Organizador", "Indica el nombre del organizador"],
        ["Apertura de puertas", "Indica la hora de apertura de puertas"],
        ["Dirección", "Indica la dirección del lugar"],
      ]) {
        const field = input(label);
        expect(field.getAttribute("aria-invalid")).toBe("true");
        expect(describedTexts(field)).toContain(message);
      }
      expect(input("Organizador").getAttribute("aria-describedby")).toBe(
        "organizer-event-organizer-description organizer-event-organizer-error",
      );
      expect(document.activeElement).toBe(input("Nombre del evento"));
      expect(push).not.toHaveBeenCalled();
    });

    it("una apertura posterior al inicio marca 'Apertura de puertas'; la misma hora es válida", async () => {
      render(<OrganizerEventForm />);
      await fillValid();
      type(input("Apertura de puertas"), "21:00");
      fireEvent.click(publishButton());

      const doorsOpen = input("Apertura de puertas");
      expect(doorsOpen.getAttribute("aria-invalid")).toBe("true");
      expect(document.getElementById(doorsOpen.getAttribute("aria-describedby")!)?.textContent).toBe(DOORS_ORDER_ERROR);
      expect(input("Hora de inicio").getAttribute("aria-invalid")).toBe("false");
      expect(push).not.toHaveBeenCalled();

      type(doorsOpen, "20:00");
      fireEvent.blur(doorsOpen);
      expect(screen.queryByText(DOORS_ORDER_ERROR)).toBeNull();
      expect(input("Apertura de puertas").getAttribute("aria-invalid")).toBe("false");
    });

    it("el evento publicado se guarda con las claves de OrganizerEvent, sin modo, máximo ni descripción por tipo", async () => {
      render(<OrganizerEventForm />);
      await fillValid();
      fireEvent.click(publishButton());

      await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=publicado"));
      const [saved] = JSON.parse(localStorage.getItem("mentec-organizer-events")!).state.events;
      expect(Object.keys(saved).sort()).toEqual(
        ["id", "title", "category", "startsAt", "venue", "city", "imageUrl", "priceFrom", "sold", "capacity", "status"].sort(),
      );
      expect(saved.city).toBe("Lima");
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
