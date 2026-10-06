import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { uploadPresigned } from "@vercel/blob/client";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EventCategory } from "@/modules/events";

import { createEventAction, updateEventAction } from "../actions/eventDrafts.actions";
import type { EditableEvent, EventDraftFormValues, OrganizerOption, VenueOption } from "../types/organizer.types";
import { OrganizerEventForm } from "./OrganizerEventForm";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../actions/eventDrafts.actions", () => ({ createEventAction: vi.fn(), updateEventAction: vi.fn() }));
vi.mock("@vercel/blob/client", () => ({ uploadPresigned: vi.fn() }));

const BLOB_URL = "https://abc.public.blob.vercel-storage.com/events/draft/portada.jpg";

const STADIUM: VenueOption = {
  id: "5b0a3c1e-2f4d-4a6b-8c9d-0e1f2a3b4c5d",
  name: "Estadio Nacional",
  address: "Av. Prueba 123, Cercado",
  lat: null,
  lng: null,
  placeId: null,
  status: "approved",
  organizerId: null,
  city: "Lima",
  sections: [
    { id: "11111111-1111-4111-8111-111111111111", name: "Campo", seating: "general", capacity: 1000 },
    { id: "22222222-2222-4222-8222-222222222222", name: "Occidente", seating: "numbered", capacity: 240 },
  ],
};
const THEATER: VenueOption = {
  id: "6c1b4d2f-3a5e-4b7c-9d0e-1f2a3b4c5d6e",
  name: "Teatro Municipal",
  address: "Av. Prueba 123, Cercado",
  lat: null,
  lng: null,
  placeId: null,
  status: "approved",
  organizerId: null,
  city: "Arequipa",
  sections: [{ id: "33333333-3333-4333-8333-333333333333", name: "Platea", seating: "numbered", capacity: 300 }],
};
const VENUES = [STADIUM, THEATER];
const ZONE_ID = "44444444-4444-4444-8444-444444444444";
/** Recinto pendiente (ingresado a mano) de un organizador: solo él (o el admin con él elegido) lo ve en el Select. */
const pendingVenue = (id: string, name: string, organizerId: string): VenueOption => ({
  id,
  name,
  address: "Av. Larco 1150, Miraflores",
  lat: null,
  lng: null,
  placeId: null,
  status: "pending_review",
  organizerId,
  city: "Lima",
  sections: [{ id: ZONE_ID, name: "General", seating: "general", capacity: 80 }],
});
// Categorías de la BD (`listEventCategories`), incluidas las de la migración 0009.
const CATEGORIES: EventCategory[] = [
  { id: "c0000000-0000-4000-8000-000000000001", slug: "bar-shop", name: "Bares" },
  { id: "c0000000-0000-4000-8000-000000000002", slug: "cafe-shop", name: "Café" },
  { id: "c0000000-0000-4000-8000-000000000003", slug: "conciertos", name: "Conciertos" },
  { id: "c0000000-0000-4000-8000-000000000004", slug: "drink", name: "Drinks" },
  { id: "c0000000-0000-4000-8000-000000000005", slug: "festivales", name: "Festivales" },
];
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
const manualCheckbox = () => screen.getByRole("checkbox", { name: "Mi recinto no está en la lista" });
/** Bloque «Datos del recinto» (fieldset) y una de sus zonas. */
const manualBlock = () => within(screen.getByRole("group", { name: "Datos del recinto" }));
const zoneInput = (n: number, label: "Nombre de la zona" | "Aforo") =>
  within(manualBlock().getByRole("group", { name: `Zona ${n}` })).getByLabelText(label) as HTMLInputElement;
const addZoneButton = () => manualBlock().getByRole("button", { name: "Agregar zona" });
const removeZoneButton = (n: number) => manualBlock().getByRole("button", { name: `Quitar zona ${n}` });
/** Consulta del mapa del detalle (`buildVenueQuery`). */
const mapQuery = (venue: string, address: string, city: string) => `${venue}, ${address}, ${city}, Perú`;
const directionsHref = (query: string) =>
  `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: query })}`;
const mapsLink = () => screen.getByRole("link", { name: /Abrir en Google Maps/ });
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

/** Abre un `Select`, devuelve el texto de sus opciones y elige `option` (lo cierra). */
async function optionsAndChoose(name: string, option: string) {
  const trigger = combobox(name);
  fireEvent.click(trigger);
  const options = await screen.findAllByRole("option");
  const item = options.find((candidate) => candidate.textContent === option);
  if (!item) throw new Error(`Sin la opción ${option}`);
  fireEvent.pointerDown(item, { pointerType: "mouse" });
  fireEvent.click(item);
  await waitFor(() => expect(selectText(trigger)).toBe(option));
  return options.map((candidate) => candidate.textContent);
}

/** Lo mínimo para guardar un borrador: nombre y categoría. */
async function fillRequired(title = "Festival", category = "Conciertos") {
  type(input("Nombre del evento"), title);
  await choose("Categoría", category);
}

function renderForm(props: Partial<ComponentProps<typeof OrganizerEventForm>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <OrganizerEventForm userId="user-1" categories={CATEGORIES} venues={VENUES} {...props} />
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

  it("vacío pide el nombre y la categoría, enfoca el nombre y no guarda", async () => {
    renderForm();
    expect(selectText(combobox("Categoría"))).toBe("Elige una categoría");
    fireEvent.click(saveButton());

    expect(screen.getByText("Ingresa el nombre del evento")).toBeTruthy();
    expect(document.getElementById("organizer-event-category-error")?.textContent).toBe("Elige una categoría");
    expect(combobox("Categoría").getAttribute("aria-invalid")).toBe("true");
    expect(input("Nombre del evento").getAttribute("aria-invalid")).toBe("true");
    expect(input("Nombre del evento").getAttribute("aria-describedby")).toBe("organizer-event-title-error");
    await waitFor(() => expect(document.activeElement).toBe(input("Nombre del evento")));
    expect(createEventAction).not.toHaveBeenCalled();
  });

  it("el Select lista las categorías de la BD (con Café, Drinks y Bares) y la vista previa muestra la elegida", async () => {
    renderForm();
    const preview = within(screen.getByRole("complementary", { name: "Vista previa" }));
    expect(preview.getByText("Categoría")).toBeTruthy();

    fireEvent.click(combobox("Categoría"));
    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["Bares", "Café", "Conciertos", "Drinks", "Festivales"]);
    fireEvent.pointerDown(options[1], { pointerType: "mouse" });
    fireEvent.click(options[1]);
    await waitFor(() => expect(selectText(combobox("Categoría"))).toBe("Café"));
    expect(preview.getByText("Café")).toBeTruthy();
  });

  it("con el nombre y la categoría crea el borrador y vuelve a Eventos con el aviso", async () => {
    renderForm();
    await fillRequired("  Mi borrador ", "Drinks");
    fireEvent.click(saveButton());

    await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=borrador"));
    expect(createEventAction).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Mi borrador", category: "drink", ticketTypes: [] }),
    );
    expect(updateEventAction).not.toHaveBeenCalled();
    // Sigue deshabilitado hasta que llega Eventos: un segundo clic no crea otro borrador.
    expect((saveButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it("un error del servidor se muestra y no navega", async () => {
    vi.mocked(createEventAction).mockResolvedValue({ ok: false, error: "Tu cuenta de organizador no está aprobada." });
    renderForm();
    await fillRequired("Mi borrador");
    fireEvent.click(saveButton());

    expect((await screen.findByRole("alert")).textContent).toBe("Tu cuenta de organizador no está aprobada.");
    expect(push).not.toHaveBeenCalled();
    expect((saveButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it("si la acción falla por red, mensaje genérico", async () => {
    vi.mocked(createEventAction).mockRejectedValue(new Error("fetch failed"));
    renderForm();
    await fillRequired("Mi borrador");
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
      await fillRequired();
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

  describe("recinto manual (spec organizer-manual-venue)", () => {
    /** Datos del bloque manual válidos: nombre, dirección, ciudad y una zona. */
    async function fillManualVenue() {
      fireEvent.click(manualCheckbox());
      type(input("Nombre del recinto"), "Café La Esquina");
      type(input("Dirección exacta"), "Av. Larco 1150, Miraflores");
      await choose("Ciudad", "Cusco");
      type(zoneInput(1, "Nombre de la zona"), "General");
      type(zoneInput(1, "Aforo"), "200");
    }

    it("el checkbox está desmarcado; al marcarlo deshabilita el Select y abre el bloque; al desmarcarlo vuelve", async () => {
      renderForm();
      expect(manualCheckbox().getAttribute("aria-checked")).toBe("false");
      expect(screen.queryByLabelText("Nombre del recinto")).toBeNull();
      expect(isDisabled(combobox("Recinto"))).toBe(false);

      fireEvent.click(manualCheckbox());
      expect(isDisabled(combobox("Recinto"))).toBe(true);
      expect(input("Nombre del recinto").placeholder).toBe("Ej.: Café La Esquina");
      expect(screen.getByText("Calle y número, distrito. Ej.: Av. Larco 1150, Miraflores")).toBeTruthy();
      expect(selectText(combobox("Ciudad"))).toBe("Elige la ciudad");
      expect(screen.getByText("Completa el nombre, la dirección y la ciudad para ver el recinto en el mapa.")).toBeTruthy();
      type(input("Nombre del recinto"), "Café La Esquina");

      fireEvent.click(manualCheckbox());
      expect(screen.queryByLabelText("Nombre del recinto")).toBeNull();
      expect(isDisabled(combobox("Recinto"))).toBe(false);
      // Lo escrito se conserva al volver a marcarlo.
      fireEvent.click(manualCheckbox());
      expect(input("Nombre del recinto").value).toBe("Café La Esquina");
    });

    it("desmarcado no se envía: el recinto es el del Select", async () => {
      renderForm();
      await fillRequired();
      fireEvent.click(manualCheckbox());
      type(input("Nombre del recinto"), "C");
      fireEvent.click(manualCheckbox());
      await choose("Recinto", "Estadio Nacional · Lima");
      fireEvent.click(saveButton());

      await waitFor(() => expect(createEventAction).toHaveBeenCalled());
      expect(vi.mocked(createEventAction).mock.calls[0][0]).toMatchObject({
        venueId: STADIUM.id,
        manualVenue: { enabled: false, name: "C" },
      });
    });

    it("zonas: empieza con una (no se quita), se añaden hasta 10 y se quitan", () => {
      renderForm();
      fireEvent.click(manualCheckbox());
      expect(manualBlock().getAllByLabelText("Nombre de la zona")).toHaveLength(1);
      expect(isDisabled(removeZoneButton(1))).toBe(true);

      fireEvent.click(addZoneButton());
      expect(manualBlock().getAllByLabelText("Nombre de la zona")).toHaveLength(2);
      expect(isDisabled(removeZoneButton(1))).toBe(false);
      type(zoneInput(1, "Nombre de la zona"), "General");
      type(zoneInput(2, "Nombre de la zona"), "VIP");
      fireEvent.click(removeZoneButton(1));
      expect(manualBlock().getAllByLabelText("Nombre de la zona")).toHaveLength(1);
      expect(zoneInput(1, "Nombre de la zona").value).toBe("VIP");

      for (let zone = 2; zone <= 10; zone++) fireEvent.click(addZoneButton());
      expect(manualBlock().getAllByLabelText("Nombre de la zona")).toHaveLength(10);
      expect(isDisabled(addZoneButton())).toBe(true);
      expect(manualBlock().getByText("Máximo 10 zonas.")).toBeTruthy();
    });

    it("valida nombre, dirección, ciudad y zonas con sus mensajes en cada campo y no guarda", async () => {
      renderForm();
      await fillRequired();
      fireEvent.click(manualCheckbox());
      type(input("Nombre del recinto"), "C");
      type(input("Dirección exacta"), "Larco");
      fireEvent.click(saveButton());

      const block = manualBlock();
      expect(block.getByText("El nombre del recinto debe tener al menos 2 caracteres")).toBeTruthy();
      expect(block.getByText(/^La dirección es muy corta/)).toBeTruthy();
      expect(block.getByText("Elige una ciudad de la lista")).toBeTruthy();
      expect(block.getByText("Ingresa el nombre de la zona")).toBeTruthy();
      expect(block.getByText("Ingresa el aforo de la zona")).toBeTruthy();
      const address = input("Dirección exacta");
      expect(address.getAttribute("aria-invalid")).toBe("true");
      expect(address.getAttribute("aria-describedby")).toBe(
        "organizer-event-manualVenue-address-help organizer-event-manualVenue-address-error",
      );
      expect(combobox("Ciudad").getAttribute("aria-invalid")).toBe("true");
      await waitFor(() => expect(document.activeElement).toBe(input("Nombre del recinto")));
      expect(createEventAction).not.toHaveBeenCalled();

      // Tras el primer intento, se revalida al salir del campo.
      type(input("Nombre del recinto"), "");
      fireEvent.blur(input("Nombre del recinto"));
      expect(block.getByText("Ingresa el nombre del recinto")).toBeTruthy();
      type(zoneInput(1, "Aforo"), "0");
      fireEvent.blur(zoneInput(1, "Aforo"));
      expect(block.getByText("El aforo debe ser un número entero de 1 a 100,000")).toBeTruthy();
      expect(zoneInput(1, "Aforo").getAttribute("aria-invalid")).toBe("true");
    });

    it("los tipos de entrada se definen sobre las zonas y se envían con su id", async () => {
      renderForm();
      await fillRequired();
      await fillManualVenue();
      fireEvent.click(addZoneButton());
      type(zoneInput(2, "Nombre de la zona"), "VIP");
      type(zoneInput(2, "Aforo"), "50");

      expect(section("General").getByText("200 lugares de pie")).toBeTruthy();
      expect(section("VIP").getByText("50 lugares de pie")).toBeTruthy();
      fireEvent.click(sellCheckbox("VIP"));
      type(sectionInput("VIP", "Precio (S/)"), "80");
      expect(screen.getByText("50 entradas")).toBeTruthy();
      const preview = within(screen.getByRole("complementary", { name: "Vista previa" }));
      expect(preview.getByText("Café La Esquina · Cusco")).toBeTruthy();

      fireEvent.click(saveButton());
      await waitFor(() => expect(createEventAction).toHaveBeenCalled());
      const values = vi.mocked(createEventAction).mock.calls[0][0] as EventDraftFormValues;
      const zones = values.manualVenue?.sections ?? [];
      expect(values.manualVenue).toMatchObject({
        enabled: true,
        name: "Café La Esquina",
        address: "Av. Larco 1150, Miraflores",
        city: "Cusco",
        sections: [
          { name: "General", capacity: "200" },
          { name: "VIP", capacity: "50" },
        ],
      });
      expect(values.ticketTypes).toEqual([
        { sectionId: zones[0].id, selected: false, name: "General", price: "" },
        { sectionId: zones[1].id, selected: true, name: "VIP", price: "80" },
      ]);
    });

    describe("dirección y mapa", () => {
      const stadiumQuery = mapQuery("Estadio Nacional", STADIUM.address, "Lima");

      it("con un recinto de la lista: su dirección, «Ver mapa» con la consulta del detalle y «Abrir en Google Maps»", async () => {
        renderForm({ mapsEmbedKey: "test-key" });
        await choose("Recinto", "Estadio Nacional · Lima");

        expect(screen.getByText(`${STADIUM.address}, Lima`)).toBeTruthy();
        expect(mapsLink().getAttribute("href")).toBe(directionsHref(stadiumQuery));
        expect(mapsLink().getAttribute("target")).toBe("_blank");
        expect(document.querySelector("iframe")).toBeNull();

        fireEvent.click(screen.getByRole("button", { name: "Ver mapa" }));
        const src = new URL(document.querySelector("iframe")?.getAttribute("src") ?? "");
        expect(src.searchParams.get("q")).toBe(stadiumQuery);
        expect(src.searchParams.get("key")).toBe("test-key");
      });

      it("sin clave: sin mapa, pero con la dirección y «Abrir en Google Maps»", async () => {
        renderForm();
        await choose("Recinto", "Estadio Nacional · Lima");

        expect(screen.queryByRole("button", { name: "Ver mapa" })).toBeNull();
        expect(screen.getByText(`${STADIUM.address}, Lima`)).toBeTruthy();
        expect(mapsLink().getAttribute("href")).toBe(directionsHref(stadiumQuery));
      });

      it("en modo manual, con los valores escritos", async () => {
        renderForm({ mapsEmbedKey: "test-key" });
        await choose("Recinto", "Estadio Nacional · Lima");
        await fillManualVenue();

        const query = mapQuery("Café La Esquina", "Av. Larco 1150, Miraflores", "Cusco");
        expect(mapsLink().getAttribute("href")).toBe(directionsHref(query));
        fireEvent.click(screen.getByRole("button", { name: "Ver mapa" }));
        expect(new URL(document.querySelector("iframe")?.getAttribute("src") ?? "").searchParams.get("q")).toBe(query);
      });
    });

    it("un organizador ve los aprobados y sus recintos pendientes, no los de otros", async () => {
      const own = pendingVenue("7d2c5e3a-4b6f-4c8d-8e1f-2a3b4c5d6e7f", "Café Propio", "user-1");
      const other = pendingVenue("8e3d6f4b-5c7a-4d9e-9f2a-3b4c5d6e7f8a", "Bar Ajeno", "user-2");
      renderForm({ venues: [...VENUES, own, other] });

      expect(await optionsAndChoose("Recinto", "Café Propio · Lima")).toEqual([
        "Estadio Nacional · Lima",
        "Teatro Municipal · Arequipa",
        "Café Propio · Lima",
      ]);
    });

    it("el admin ve los pendientes solo del organizador elegido; al cambiarlo, se quita el pendiente elegido", async () => {
      const ofPulso = pendingVenue("7d2c5e3a-4b6f-4c8d-8e1f-2a3b4c5d6e7f", "Café Pulso", ORGANIZERS[0].id);
      const ofAna = pendingVenue("8e3d6f4b-5c7a-4d9e-9f2a-3b4c5d6e7f8a", "Bar Ana", ORGANIZERS[1].id);
      renderForm({ organizers: ORGANIZERS, venues: [...VENUES, ofPulso, ofAna] });
      const approved = ["Estadio Nacional · Lima", "Teatro Municipal · Arequipa"];

      expect(await optionsAndChoose("Recinto", "Estadio Nacional · Lima")).toEqual(approved);
      await choose("Organizador", "Ana Pérez");
      expect(await optionsAndChoose("Recinto", "Bar Ana · Lima")).toEqual([...approved, "Bar Ana · Lima"]);
      expect(section("General").getByText("80 lugares de pie")).toBeTruthy();

      await choose("Organizador", "Pulso Producciones S.A.C.");
      expect(selectText(combobox("Recinto"))).toBe("Elige el recinto");
      expect(screen.getByText("Elige el recinto para configurar los tipos de entrada.")).toBeTruthy();
      expect(await optionsAndChoose("Recinto", "Café Pulso · Lima")).toEqual([...approved, "Café Pulso · Lima"]);
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
      await fillRequired();
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
      await fillRequired();
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
      await fillRequired();
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
      featured: false,
      hasSales: false,
      sold: 0,
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

    it("con su recinto aún pendiente (ingresado a mano) abre el bloque relleno y guarda las correcciones", async () => {
      const own = pendingVenue("7d2c5e3a-4b6f-4c8d-8e1f-2a3b4c5d6e7f", "Café Pulso", ORGANIZERS[0].id);
      renderForm({
        event: { ...event, venueId: own.id, ticketTypes: [{ sectionId: ZONE_ID, name: "General", priceCents: 3000 }] },
        organizers: ORGANIZERS,
        venues: [...VENUES, own],
      });

      expect(manualCheckbox().getAttribute("aria-checked")).toBe("true");
      expect(isDisabled(combobox("Recinto"))).toBe(true);
      expect(input("Nombre del recinto").value).toBe("Café Pulso");
      expect(input("Dirección exacta").value).toBe("Av. Larco 1150, Miraflores");
      expect(selectText(combobox("Ciudad"))).toBe("Lima");
      expect(zoneInput(1, "Aforo").value).toBe("80");
      expect((sellCheckbox("General") as HTMLElement).getAttribute("aria-checked")).toBe("true");
      expect(sectionInput("General", "Precio (S/)").value).toBe("30.00");

      type(zoneInput(1, "Aforo"), "120");
      fireEvent.click(saveButton());
      await waitFor(() => expect(updateEventAction).toHaveBeenCalled());
      expect(vi.mocked(updateEventAction).mock.calls[0][1]).toMatchObject({
        manualVenue: { enabled: true, name: "Café Pulso", sections: [{ id: ZONE_ID, name: "General", capacity: "120" }] },
        ticketTypes: [{ sectionId: ZONE_ID, selected: true, name: "General", price: "30.00" }],
      });
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
      expect(isDisabled(manualCheckbox())).toBe(true);
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

    it("un evento publicado con ventas deja cambiar categoría, fecha y hora y nombre y precio; la estructura no", () => {
      renderForm({ event: { ...event, status: "published", hasSales: true, sold: 3 }, organizers: ORGANIZERS });

      expect(isDisabled(dateTrigger())).toBe(false);
      for (const label of ["Hora de inicio", "Apertura de puertas", "Nombre del evento", "Descripción"]) {
        expect(isDisabled(input(label))).toBe(false);
      }
      for (const name of ["Categoría", "Edad mínima"]) expect(isDisabled(combobox(name))).toBe(false);
      expect(isDisabled(sectionInput("Occidente", "Nombre del tipo de entrada"))).toBe(false);
      expect(isDisabled(sectionInput("Occidente", "Precio (S/)"))).toBe(false);
      for (const name of ["Recinto", "Organizador"]) expect(isDisabled(combobox(name))).toBe(true);
      expect(isDisabled(sellCheckbox("Campo"))).toBe(true);
      expect(isDisabled(sellCheckbox("Occidente"))).toBe(true);
    });

    describe("cambio de fecha con entradas vendidas (Decisión 3)", () => {
      const soldEvent: EditableEvent = { ...event, status: "published", hasSales: true, sold: 3 };
      const saveChanges = () => fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

      it("cambiar la hora pide confirmación con las entradas vendidas; al confirmar, guarda", async () => {
        renderForm({ event: soldEvent, organizers: ORGANIZERS });
        type(input("Hora de inicio"), "21:00");
        saveChanges();

        const dialog = await screen.findByRole("alertdialog");
        expect(
          within(dialog).getByText("Este evento tiene 3 entradas vendidas. Los compradores verán la nueva fecha."),
        ).toBeTruthy();
        expect(updateEventAction).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole("button", { name: "Cambiar fecha" }));
        await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador?guardado=cambios"));
        expect(vi.mocked(updateEventAction).mock.calls[0][1]).toMatchObject({ time: "21:00" });
      });

      it("con 1 entrada vendida lo dice en singular; cancelar no guarda", async () => {
        renderForm({ event: { ...soldEvent, sold: 1 }, organizers: ORGANIZERS });
        type(input("Apertura de puertas"), "19:00");
        saveChanges();

        const dialog = await screen.findByRole("alertdialog");
        expect(within(dialog).getByText(/^Este evento tiene 1 entrada vendida\./)).toBeTruthy();
        fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
        await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
        expect(updateEventAction).not.toHaveBeenCalled();
      });

      it("sin cambio de fecha, o sin entradas vendidas, guarda sin confirmación", async () => {
        const { unmount } = renderForm({ event: soldEvent, organizers: ORGANIZERS });
        type(sectionInput("Occidente", "Precio (S/)"), "99");
        saveChanges();
        await waitFor(() => expect(updateEventAction).toHaveBeenCalledTimes(1));
        expect(screen.queryByRole("alertdialog")).toBeNull();
        unmount();

        renderForm({ event: { ...soldEvent, sold: 0 }, organizers: ORGANIZERS });
        type(input("Hora de inicio"), "21:00");
        saveChanges();
        await waitFor(() => expect(updateEventAction).toHaveBeenCalledTimes(2));
        expect(screen.queryByRole("alertdialog")).toBeNull();
      });

      it("si el servidor rechaza el precio por compras en curso, el error se ve en el formulario", async () => {
        vi.mocked(updateEventAction).mockResolvedValue({
          ok: false,
          error: "Hay compras en curso para esta entrada; inténtalo en unos minutos",
          code: "price_locked_pending",
        });
        renderForm({ event: soldEvent, organizers: ORGANIZERS });
        type(input("Hora de inicio"), "21:00");
        type(sectionInput("Occidente", "Precio (S/)"), "99");
        saveChanges();
        fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cambiar fecha" }));

        await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
        expect(screen.getByRole("alert").textContent).toBe("Hay compras en curso para esta entrada; inténtalo en unos minutos");
        expect(push).not.toHaveBeenCalled();
      });
    });

    it("un evento en revisión se edita entero, guarda «cambios» y vuelve a Eventos; si falta algo, lo explica", async () => {
      vi.mocked(updateEventAction).mockResolvedValueOnce({
        ok: false,
        error: "Falta la portada.",
        code: "incomplete",
      });
      renderForm({ event: { ...event, status: "pending_review" }, organizers: ORGANIZERS });

      for (const name of ["Categoría", "Recinto", "Organizador"]) expect(isDisabled(combobox(name))).toBe(false);
      expect(isDisabled(sellCheckbox("Campo"))).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
      expect((await screen.findByRole("alert")).textContent).toBe("Falta la portada.");
      expect(push).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/organizador"));
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
