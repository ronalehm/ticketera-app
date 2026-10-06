import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { uploadPresigned } from "@vercel/blob/client";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEventAction, updateEventAction } from "../actions/eventDrafts.actions";
import type { EditableEvent, OrganizerOption, VenueOption } from "../types/organizer.types";
import { OrganizerEventForm } from "./OrganizerEventForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../actions/eventDrafts.actions", () => ({ createEventAction: vi.fn(), updateEventAction: vi.fn() }));
vi.mock("@vercel/blob/client", () => ({ uploadPresigned: vi.fn() }));

const BLOB_URL = "https://abc.public.blob.vercel-storage.com/events/draft/portada.jpg";

const STADIUM: VenueOption = {
  id: "5b0a3c1e-2f4d-4a6b-8c9d-0e1f2a3b4c5d",
  name: "Estadio Nacional",
  city: "Lima",
  sections: [
    { id: "11111111-1111-4111-8111-111111111111", name: "Campo", seating: "general", capacity: 1000 },
    { id: "22222222-2222-4222-8222-222222222222", name: "Occidente", seating: "numbered", capacity: 240 },
  ],
};
const THEATER: VenueOption = {
  id: "6c1b4d2f-3a5e-4b7c-9d0e-1f2a3b4c5d6e",
  name: "Teatro Municipal",
  city: "Arequipa",
  sections: [{ id: "33333333-3333-4333-8333-333333333333", name: "Platea", seating: "numbered", capacity: 300 }],
};
const VENUES = [STADIUM, THEATER];
const ORGANIZERS: OrganizerOption[] = [
  { id: "00000000-0000-8000-8000-000000000001", name: "Pulso Producciones S.A.C." },
  { id: "00000000-0000-8000-8000-000000000002", name: "Ana Pérez" },
];

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const type = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });
const saveButton = () => screen.getByRole("button", { name: "Guardar borrador" });
const combobox = (name: string) => screen.getByRole("combobox", { name });
const selectText = (element: HTMLElement) => element.querySelector("[data-slot=select-value]")?.textContent;
const section = (name: string) => within(screen.getByRole("group", { name }));
const sectionInput = (name: string, label: string) => section(name).getByLabelText(label) as HTMLInputElement;
const sellCheckbox = (name: string) => section(name).getByRole("checkbox", { name: "Vender entradas en esta sección" });
/** Deshabilitado como control nativo o como control de Base UI. */
const isDisabled = (element: Element) =>
  element.hasAttribute("disabled") ||
  element.getAttribute("aria-disabled") === "true" ||
  element.hasAttribute("data-disabled");

/** Trigger del DatePicker de «Fecha» (un botón, no un input). */
const dateTrigger = () => screen.getByLabelText("Fecha");
/** Botón de un día del mes visible del calendario; rdp lo nombra con la fecha completa («… 20 de octubre de 2026»). */
const dayButton = (date: string) => screen.getByRole("button", { name: new RegExp(`\\b${date}`) });

/** Elige una opción de un `Select` de Base UI. */
async function choose(name: string, option: string) {
  const trigger = combobox(name);
  fireEvent.click(trigger);
  const item = await screen.findByRole("option", { name: option });
  // Base UI solo acepta el clic de ratón que empezó sobre la opción.
  fireEvent.pointerDown(item, { pointerType: "mouse" });
  fireEvent.click(item);
  await waitFor(() => expect(selectText(trigger)).toBe(option));
}

function renderForm(props: Partial<ComponentProps<typeof OrganizerEventForm>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <OrganizerEventForm userId="user-1" venues={VENUES} {...props} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 1920, height: 1080, close: vi.fn() })));
  URL.createObjectURL = vi.fn(() => "blob:local-preview");
  URL.revokeObjectURL = vi.fn();
  vi.mocked(createEventAction).mockResolvedValue({ ok: true, id: "e0000000-0000-4000-8000-000000000001" });
  vi.mocked(updateEventAction).mockResolvedValue({ ok: true });
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe("OrganizerEventForm", () => {
  it("solo guarda borradores: sin botón de publicar, con Cancelar hacia Eventos", () => {
    renderForm();
    expect(saveButton()).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Publicar|Enviar a revisión/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Cancelar" }).getAttribute("href")).toBe("/organizador");
  });

  it("vacío solo pide el nombre, lo enfoca y no guarda", async () => {
    renderForm();
    fireEvent.click(saveButton());

    expect(screen.getByText("Ingresa el nombre del evento")).toBeTruthy();
    expect(input("Nombre del evento").getAttribute("aria-invalid")).toBe("true");
    expect(input("Nombre del evento").getAttribute("aria-describedby")).toBe("organizer-event-title-error");
    await waitFor(() => expect(document.activeElement).toBe(input("Nombre del evento")));
    expect(createEventAction).not.toHaveBeenCalled();
  });

  it("con solo el nombre crea el borrador y vuelve a Eventos con el aviso", async () => {
    renderForm();
    type(input("Nombre del evento"), "  Mi borrador ");
    fireEvent.click(saveButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=borrador"));
    expect(createEventAction).toHaveBeenCalledWith(expect.objectContaining({ title: "Mi borrador", ticketTypes: [] }));
    expect(updateEventAction).not.toHaveBeenCalled();
    // Sigue deshabilitado hasta que llega Eventos: un segundo clic no crea otro borrador.
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it("un error del servidor se muestra y no navega", async () => {
    vi.mocked(createEventAction).mockResolvedValue({ ok: false, error: "Tu cuenta de organizador no está aprobada." });
    renderForm();
    type(input("Nombre del evento"), "Mi borrador");
    fireEvent.click(saveButton());

    expect((await screen.findByRole("alert")).textContent).toBe("Tu cuenta de organizador no está aprobada.");
    expect(push).not.toHaveBeenCalled();
    expect((saveButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it("si la acción falla por red, mensaje genérico", async () => {
    vi.mocked(createEventAction).mockRejectedValue(new Error("fetch failed"));
    renderForm();
    type(input("Nombre del evento"), "Mi borrador");
    fireEvent.click(saveButton());

    expect((await screen.findByRole("alert")).textContent).toBe("No pudimos completar la solicitud. Inténtalo de nuevo.");
  });

  describe("recinto y tipos de entrada", () => {
    it("sin recinto lo indica; al elegirlo, una fila sin marcar por sección con su nombre por defecto", async () => {
      renderForm();
      expect(screen.getByText("Elige el recinto para configurar los tipos de entrada.")).toBeTruthy();

      await choose("Recinto", "Estadio Nacional · Lima");
      expect(screen.getAllByRole("checkbox", { name: "Vender entradas en esta sección" })).toHaveLength(2);
      expect(section("Campo").getByText("1,000 lugares de pie")).toBeTruthy();
      expect(section("Occidente").getByText("240 asientos numerados")).toBeTruthy();
      expect((sellCheckbox("Campo") as HTMLElement).getAttribute("aria-checked")).toBe("false");
      expect(sectionInput("Campo", "Nombre del tipo de entrada").value).toBe("Campo");
      expect(sectionInput("Campo", "Precio (S/)").disabled).toBe(true);
      expect(screen.getByText("0 entradas")).toBeTruthy();
    });

    it("marcar una sección habilita sus campos y suma su capacidad", async () => {
      renderForm();
      await choose("Recinto", "Estadio Nacional · Lima");
      fireEvent.click(sellCheckbox("Occidente"));

      expect(sectionInput("Occidente", "Precio (S/)").disabled).toBe(false);
      expect(screen.getByText("240 entradas")).toBeTruthy();
    });

    it("una sección marcada sin precio no se guarda y el error va en su campo", async () => {
      renderForm();
      type(input("Nombre del evento"), "Festival");
      await choose("Recinto", "Estadio Nacional · Lima");
      fireEvent.click(sellCheckbox("Campo"));
      type(sectionInput("Campo", "Nombre del tipo de entrada"), " ");
      fireEvent.click(saveButton());

      expect(section("Campo").getByText("Ingresa el nombre del tipo de entrada")).toBeTruthy();
      expect(section("Campo").getByText("Ingresa el precio")).toBeTruthy();
      expect(sectionInput("Campo", "Precio (S/)").getAttribute("aria-invalid")).toBe("true");
      expect(createEventAction).not.toHaveBeenCalled();
    });

    it("cambiar de recinto reinicia las filas", async () => {
      renderForm();
      await choose("Recinto", "Estadio Nacional · Lima");
      fireEvent.click(sellCheckbox("Campo"));
      await choose("Recinto", "Teatro Municipal · Arequipa");

      expect(screen.queryByRole("group", { name: "Campo" })).toBeNull();
      expect((sellCheckbox("Platea") as HTMLElement).getAttribute("aria-checked")).toBe("false");
    });

    it("envía las filas con el recinto y la vista previa muestra lugar y precio", async () => {
      renderForm();
      type(input("Nombre del evento"), "Festival");
      await choose("Recinto", "Estadio Nacional · Lima");
      fireEvent.click(sellCheckbox("Campo"));
      type(sectionInput("Campo", "Precio (S/)"), "50");

      const preview = within(screen.getByRole("complementary", { name: "Vista previa" }));
      expect(preview.getByText("Estadio Nacional · Lima")).toBeTruthy();
      expect(preview.getByText("S/ 50.00")).toBeTruthy();

      fireEvent.click(saveButton());
      await waitFor(() => expect(createEventAction).toHaveBeenCalled());
      expect(vi.mocked(createEventAction).mock.calls[0][0]).toMatchObject({
        venueId: STADIUM.id,
        ticketTypes: [
          { sectionId: STADIUM.sections[0].id, selected: true, name: "Campo", price: "50" },
          { sectionId: STADIUM.sections[1].id, selected: false, name: "Occidente", price: "" },
        ],
      });
    });
  });

  describe("fecha y portada", () => {
    // Hoy en Lima: 5 oct 2026 (10:00). Solo se finge Date: los timers reales siguen para waitFor y Base UI.
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-05T15:00:00Z"));
    });
    afterEach(() => vi.useRealTimers());

    it("la Fecha es un DatePicker, sin input type=date", () => {
      renderForm();
      expect(dateTrigger().tagName).toBe("BUTTON");
      expect(document.querySelector("input[type=date]")).toBeNull();
    });

    it("elegir la fecha en el DatePicker la envía como YYYY-MM-DD", async () => {
      renderForm();
      type(input("Nombre del evento"), "Festival");
      fireEvent.click(dateTrigger());
      fireEvent.click(dayButton("20 de octubre de 2026"));
      type(input("Hora de inicio"), "20:00");

      expect(dateTrigger().textContent).toBe("mar 20 oct 2026");
      fireEvent.click(saveButton());
      await waitFor(() => expect(createEventAction).toHaveBeenCalled());
      expect(vi.mocked(createEventAction).mock.calls[0][0]).toMatchObject({ date: "2026-10-20", time: "20:00" });
    });

    it("no deja elegir días anteriores a hoy en Lima", () => {
      renderForm();
      fireEvent.click(dateTrigger());

      expect(dayButton("4 de octubre de 2026").hasAttribute("disabled")).toBe(true);
      expect(dayButton("5 de octubre de 2026").hasAttribute("disabled")).toBe(false);
    });

    it("una hora sin fecha marca el error en el trigger de Fecha", () => {
      renderForm();
      type(input("Nombre del evento"), "Festival");
      type(input("Hora de inicio"), "20:00");
      fireEvent.click(saveButton());

      expect(document.getElementById("organizer-event-date-error")?.textContent).toBe("Elige la fecha del evento");
      expect(dateTrigger().getAttribute("aria-invalid")).toBe("true");
      expect(dateTrigger().getAttribute("aria-describedby")).toBe("organizer-event-date-error");
      expect(createEventAction).not.toHaveBeenCalled();
    });

    it("la apertura de puertas no puede ser después del inicio", () => {
      renderForm();
      type(input("Nombre del evento"), "Festival");
      fireEvent.click(dateTrigger());
      fireEvent.click(dayButton("20 de octubre de 2026"));
      type(input("Hora de inicio"), "20:00");
      type(input("Apertura de puertas"), "21:00");
      fireEvent.click(saveButton());

      expect(screen.getByText("La apertura de puertas debe ser a la hora de inicio o antes")).toBeTruthy();
      expect(createEventAction).not.toHaveBeenCalled();
    });

    it("una portada http da error; una https se ve en la vista previa", () => {
      renderForm();
      type(input("Nombre del evento"), "Festival");
      fireEvent.click(screen.getByRole("tab", { name: "Usar URL" }));
      type(input("URL de la imagen"), "http://images.unsplash.com/a.jpg");
      fireEvent.click(saveButton());

      expect(screen.getByText("Ingresa una URL válida que empiece por https://")).toBeTruthy();
      expect(createEventAction).not.toHaveBeenCalled();

      type(input("URL de la imagen"), "https://images.unsplash.com/a.jpg");
      const preview = screen.getByRole("complementary", { name: "Vista previa" });
      expect(preview.querySelector("img")?.getAttribute("src")).toBe("https://images.unsplash.com/a.jpg");
    });
    it("la portada subida llega al guardado; mientras sube no se puede guardar", async () => {
      let finishUpload!: (result: { url: string }) => void;
      vi.mocked(uploadPresigned).mockReturnValue(
        new Promise((resolve) => {
          finishUpload = (result) => resolve(result as Awaited<ReturnType<typeof uploadPresigned>>);
        }),
      );
      const { container } = renderForm();
      type(input("Nombre del evento"), "Festival");
      expect(screen.getByRole("tab", { name: "Subir imagen" }).getAttribute("aria-selected")).toBe("true");

      const file = new File(["x"], "portada.jpg", { type: "image/jpeg" });
      await act(async () => void fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } }));
      expect((saveButton() as HTMLButtonElement).disabled).toBe(true);

      await act(async () => finishUpload({ url: BLOB_URL }));
      expect((saveButton() as HTMLButtonElement).disabled).toBe(false);
      fireEvent.click(saveButton());

      await waitFor(() => expect(createEventAction).toHaveBeenCalled());
      expect(vi.mocked(createEventAction).mock.calls[0][0]).toMatchObject({ imageUrl: BLOB_URL });
    });
  });

  describe("organizador", () => {
    it("un organizador no ve el campo Organizador", () => {
      renderForm();
      expect(screen.queryByRole("combobox", { name: "Organizador" })).toBeNull();
    });

    it("un admin tiene que elegirlo y se envía el elegido", async () => {
      renderForm({ organizers: ORGANIZERS });
      type(input("Nombre del evento"), "Festival");
      fireEvent.click(saveButton());

      expect(document.getElementById("organizer-event-organizerId-error")?.textContent).toBe(
        "Elige el organizador del evento",
      );
      expect(combobox("Organizador").getAttribute("aria-invalid")).toBe("true");
      expect(createEventAction).not.toHaveBeenCalled();

      await choose("Organizador", "Ana Pérez");
      fireEvent.click(saveButton());
      await waitFor(() => expect(createEventAction).toHaveBeenCalled());
      expect(vi.mocked(createEventAction).mock.calls[0][0]).toMatchObject({ organizerId: ORGANIZERS[1].id });
    });
  });

  describe("editar", () => {
    const event: EditableEvent = {
      id: "e0000000-0000-4000-8000-000000000001",
      status: "draft",
      organizerId: ORGANIZERS[0].id,
      title: "Festival guardado",
      category: "festivales",
      description: "Tres escenarios.",
      startsAt: "2030-01-02T01:00:00.000Z", // 1 ene, 20:00 en Lima
      doorsOpenAt: "2030-01-01T23:00:00.000Z",
      minAge: 18,
      venueId: STADIUM.id,
      imageUrl: "https://images.unsplash.com/a.jpg",
      ticketTypes: [{ sectionId: STADIUM.sections[1].id, name: "Platea VIP", priceCents: 12050 }],
      reviewNote: null,
      hasSales: false,
    };

    it("precarga el borrador y guarda los cambios sobre él", async () => {
      renderForm({ event, organizers: ORGANIZERS });

      expect(input("Nombre del evento").value).toBe("Festival guardado");
      expect(dateTrigger().textContent).toBe("mar 1 ene 2030");
      expect(input("Hora de inicio").value).toBe("20:00");
      expect(input("Apertura de puertas").value).toBe("18:00");
      expect(selectText(combobox("Recinto"))).toBe("Estadio Nacional · Lima");
      expect(selectText(combobox("Organizador"))).toBe("Pulso Producciones S.A.C.");
      expect((sellCheckbox("Occidente") as HTMLElement).getAttribute("aria-checked")).toBe("true");
      expect(sectionInput("Occidente", "Nombre del tipo de entrada").value).toBe("Platea VIP");
      expect(sectionInput("Occidente", "Precio (S/)").value).toBe("120.50");

      type(input("Nombre del evento"), "Festival renombrado");
      fireEvent.click(saveButton());

      await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=borrador"));
      expect(updateEventAction).toHaveBeenCalledWith(
        event.id,
        expect.objectContaining({ title: "Festival renombrado", organizerId: ORGANIZERS[0].id }),
      );
      expect(createEventAction).not.toHaveBeenCalled();
    });

    it("si su organizador ya no está aprobado, el admin tiene que elegir otro", async () => {
      renderForm({ event: { ...event, organizerId: "00000000-0000-8000-8000-000000000099" }, organizers: ORGANIZERS });

      expect(selectText(combobox("Organizador"))).toBe("Elige el organizador");
      expect(screen.getByText("Dueño del evento: solo organizadores aprobados.")).toBeTruthy();
      fireEvent.click(saveButton());
      expect(document.getElementById("organizer-event-organizerId-error")?.textContent).toBe(
        "Elige el organizador del evento",
      );
      expect(updateEventAction).not.toHaveBeenCalled();

      await choose("Organizador", "Ana Pérez");
      fireEvent.click(saveButton());
      await waitFor(() => expect(updateEventAction).toHaveBeenCalled());
      expect(vi.mocked(updateEventAction).mock.calls[0][1]).toMatchObject({ organizerId: ORGANIZERS[1].id });
    });

    it("un evento publicado sin ventas bloquea recinto, organizador y secciones; guarda como «cambios»", async () => {
      renderForm({ event: { ...event, status: "published" }, organizers: ORGANIZERS });

      for (const name of ["Recinto", "Organizador"]) expect(isDisabled(combobox(name))).toBe(true);
      expect(isDisabled(sellCheckbox("Campo"))).toBe(true);
      expect(isDisabled(sellCheckbox("Occidente"))).toBe(true);
      // Fecha, categoría y precios siguen editables.
      expect(isDisabled(dateTrigger())).toBe(false);
      expect(isDisabled(combobox("Categoría"))).toBe(false);
      expect(isDisabled(sectionInput("Occidente", "Precio (S/)"))).toBe(false);

      type(sectionInput("Occidente", "Precio (S/)"), "99");
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=cambios"));
      expect(vi.mocked(updateEventAction).mock.calls[0][1]).toMatchObject({
        ticketTypes: expect.arrayContaining([expect.objectContaining({ price: "99" })]),
      });
    });

    it("un evento publicado con ventas solo deja cambiar título, descripción, portada y edad", () => {
      renderForm({ event: { ...event, status: "published", hasSales: true }, organizers: ORGANIZERS });

      expect(isDisabled(dateTrigger())).toBe(true);
      fireEvent.click(dateTrigger());
      expect(screen.queryByRole("grid")).toBeNull();
      for (const label of ["Hora de inicio", "Apertura de puertas"]) expect(isDisabled(input(label))).toBe(true);
      for (const name of ["Categoría", "Recinto", "Organizador"]) expect(isDisabled(combobox(name))).toBe(true);
      expect(isDisabled(sectionInput("Occidente", "Nombre del tipo de entrada"))).toBe(true);
      expect(isDisabled(sectionInput("Occidente", "Precio (S/)"))).toBe(true);
      for (const label of ["Nombre del evento", "Descripción", "URL de la imagen"]) {
        expect(isDisabled(input(label))).toBe(false);
      }
      expect(isDisabled(combobox("Edad mínima"))).toBe(false);
    });

    it("conserva una edad mínima mayor que las de la lista (+21) y la guarda igual", async () => {
      renderForm({ event: { ...event, minAge: 21 }, organizers: ORGANIZERS });

      expect(selectText(combobox("Edad mínima"))).toBe("+21");
      fireEvent.click(saveButton());
      await waitFor(() => expect(updateEventAction).toHaveBeenCalled());
      expect(vi.mocked(updateEventAction).mock.calls[0][1]).toMatchObject({ minAge: "21" });
    });
  });
});
