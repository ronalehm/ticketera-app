import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { submitComplaint } from "../services/complaints.service";
import type { ComplaintReceipt } from "../types/legal.types";
import { ComplaintForm } from "./ComplaintForm";

vi.mock("../services/complaints.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/complaints.service")>()),
  submitComplaint: vi.fn(),
}));

const RECEIPT: ComplaintReceipt = { code: "LR-2026-000001", submittedAt: "2026-10-03T15:00:00.000Z" };

const EMPTY_FORM_MESSAGES = [
  "Ingresa tus nombres",
  "Ingresa tus apellidos",
  "Ingresa tu número de documento",
  "Ingresa tu domicilio",
  "Ingresa tu número de celular",
  "Ingresa tu correo electrónico",
  "Indica si es un producto o un servicio",
  "Describe el producto o servicio",
  "Elige si es un reclamo o una queja",
  "Describe lo ocurrido",
  "Indica qué solicitas",
];

const GUARDIAN_MESSAGES = [
  "Ingresa los nombres del padre, madre o apoderado",
  "Ingresa los apellidos del padre, madre o apoderado",
  "Ingresa su número de documento",
];

const AMOUNT_ERROR = "Ingresa un monto válido, por ejemplo 120.50";

// Los `*` son `aria-hidden`: el nombre accesible es solo el texto de la etiqueta.
const textbox = (name: string, container: HTMLElement = document.body) =>
  within(container).getByRole("textbox", { name }) as HTMLInputElement | HTMLTextAreaElement;
const type = (name: string, value: string, container?: HTMLElement) =>
  fireEvent.change(textbox(name, container), { target: { value } });
const submitButton = () =>
  screen.getByRole("button", { name: /Enviar hoja de reclamación|Enviando…/ }) as HTMLButtonElement;
const minorCheckbox = () => screen.getByRole("checkbox", { name: "Soy menor de edad" });
const guardianGroup = () => screen.queryByRole("group", { name: "Datos del padre, madre o apoderado" });

function fillConsumer() {
  type("Nombres", "Luis");
  type("Apellidos", "Pérez");
  type("Número de documento", "12345678");
  type("Domicilio", "Av. Arequipa 123, Lima");
  type("Celular", "912345678");
  type("Correo electrónico", "luis@correo.pe");
}

function fillValid() {
  fillConsumer();
  fireEvent.click(screen.getByRole("radio", { name: "Servicio" }));
  type("Monto reclamado (opcional)", "120.50");
  type("Descripción", "2 entradas para Noche de sintetizadores");
  fireEvent.click(screen.getByRole("radio", { name: "Reclamo" }));
  type("Detalle", "No recibí las entradas.");
  type("Pedido", "Que me envíen las entradas.");
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ComplaintForm", () => {
  it("envío vacío muestra los 11 mensajes (sin apoderado ni monto), enfoca 'Nombres' y no llama al service", () => {
    render(<ComplaintForm />);
    fireEvent.click(submitButton());

    for (const message of EMPTY_FORM_MESSAGES) {
      expect(screen.getByText(message)).toBeTruthy();
    }
    for (const message of [...GUARDIAN_MESSAGES, AMOUNT_ERROR]) {
      expect(screen.queryByText(message)).toBeNull();
    }
    expect(textbox("Nombres").getAttribute("aria-invalid")).toBe("true");
    expect(textbox("Nombres").getAttribute("aria-describedby")).toBe("complaint-firstName-error");
    expect(textbox("Correo electrónico").getAttribute("aria-describedby")).toBe(
      "complaint-email-description complaint-email-error",
    );
    expect(
      screen.getByRole("radiogroup", { name: "Tipo", description: "Elige si es un reclamo o una queja" }),
    ).toBeTruthy();
    expect(document.activeElement).toBe(textbox("Nombres"));
    expect(submitComplaint).not.toHaveBeenCalled();
  });

  it("con los datos del consumidor válidos, el foco va al primer RadioGroup sin elegir", () => {
    render(<ComplaintForm />);
    fillConsumer();
    fireEvent.click(submitButton());

    const itemTypeGroup = screen.getByRole("radiogroup", {
      name: "Tipo",
      description: "Indica si es un producto o un servicio",
    });
    expect(itemTypeGroup.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(itemTypeGroup);
  });

  it("muestra cada tipo de reclamación con su definición", () => {
    render(<ComplaintForm />);
    expect(
      screen.getByRole("radio", {
        name: "Reclamo",
        description: "Disconformidad relacionada a los productos o servicios.",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Queja", description: /malestar o descontento/ })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Producto" })).toBeTruthy();
  });

  it("'Soy menor de edad' muestra los campos obligatorios del apoderado; desmarcado no bloquean el envío", async () => {
    vi.mocked(submitComplaint).mockResolvedValue(RECEIPT);
    render(<ComplaintForm />);
    expect(guardianGroup()).toBeNull();

    fillValid();
    fireEvent.click(minorCheckbox());
    const group = guardianGroup();
    expect(group).toBeTruthy();
    expect(textbox("Nombres", group!).required).toBe(true);
    expect(within(group!).getByRole("combobox", { name: "Tipo de documento" }).textContent).toContain("DNI");

    fireEvent.click(submitButton());
    for (const message of GUARDIAN_MESSAGES) {
      expect(within(group!).getByText(message)).toBeTruthy();
    }
    expect(document.activeElement).toBe(textbox("Nombres", group!));
    expect(submitComplaint).not.toHaveBeenCalled();

    fireEvent.click(minorCheckbox());
    expect(guardianGroup()).toBeNull();

    fireEvent.click(submitButton());
    await waitFor(() => expect(submitComplaint).toHaveBeenCalledTimes(1));
    expect(vi.mocked(submitComplaint).mock.calls[0][0].isMinor).toBe(false);
  });

  it("envío vacío con 'Soy menor de edad' muestra a la vez los errores del consumidor y del apoderado", () => {
    render(<ComplaintForm />);
    fireEvent.click(minorCheckbox());
    fireEvent.click(submitButton());

    for (const message of EMPTY_FORM_MESSAGES) {
      expect(screen.getByText(message)).toBeTruthy();
    }
    const group = guardianGroup()!;
    for (const message of GUARDIAN_MESSAGES) {
      expect(within(group).getByText(message)).toBeTruthy();
    }
    expect(textbox("Nombres", group).getAttribute("aria-invalid")).toBe("true");
    // El foco va al primer campo inválido del formulario: los nombres del consumidor.
    expect(document.activeElement?.id).toBe("complaint-firstName");
    expect(submitComplaint).not.toHaveBeenCalled();
  });

  it("con apoderado válido, el envío incluye sus datos", async () => {
    vi.mocked(submitComplaint).mockResolvedValue(RECEIPT);
    render(<ComplaintForm />);
    fillValid();
    fireEvent.click(minorCheckbox());
    const group = guardianGroup()!;
    type("Nombres", "Ana", group);
    type("Apellidos", "Pérez", group);
    type("Número de documento", "87654321", group);

    fireEvent.click(submitButton());

    await waitFor(() => expect(submitComplaint).toHaveBeenCalledTimes(1));
    expect(vi.mocked(submitComplaint).mock.calls[0][0]).toMatchObject({
      isMinor: true,
      guardianFirstName: "Ana",
      guardianLastName: "Pérez",
      guardianDocumentType: "dni",
      guardianDocumentNumber: "87654321",
    });
  });

  it("un monto con coma o letras muestra su error; vacío es válido", async () => {
    vi.mocked(submitComplaint).mockResolvedValue(RECEIPT);
    render(<ComplaintForm />);
    fillValid();

    type("Monto reclamado (opcional)", "12,5");
    fireEvent.click(submitButton());
    expect(screen.getByText(AMOUNT_ERROR)).toBeTruthy();
    expect(document.activeElement).toBe(textbox("Monto reclamado (opcional)"));

    type("Monto reclamado (opcional)", "abc");
    fireEvent.blur(textbox("Monto reclamado (opcional)"));
    expect(screen.getByText(AMOUNT_ERROR)).toBeTruthy();
    expect(submitComplaint).not.toHaveBeenCalled();

    type("Monto reclamado (opcional)", "");
    fireEvent.click(submitButton());
    await waitFor(() => expect(submitComplaint).toHaveBeenCalledTimes(1));
    expect(vi.mocked(submitComplaint).mock.calls[0][0].amount).toBeNull();
  });

  it("envío válido: 'Enviando…', datos transformados y confirmación con el foco en el título", async () => {
    let resolveSubmit!: (receipt: ComplaintReceipt) => void;
    vi.mocked(submitComplaint).mockReturnValue(new Promise((resolve) => (resolveSubmit = resolve)));
    render(<ComplaintForm />);

    fillValid();
    fireEvent.click(submitButton());

    expect(submitButton().textContent).toContain("Enviando…");
    expect(submitButton().disabled).toBe(true);
    expect(submitComplaint).toHaveBeenCalledWith({
      firstName: "Luis",
      lastName: "Pérez",
      documentType: "dni",
      documentNumber: "12345678",
      address: "Av. Arequipa 123, Lima",
      phone: "912345678",
      email: "luis@correo.pe",
      isMinor: false,
      guardianFirstName: "",
      guardianLastName: "",
      guardianDocumentType: "dni",
      guardianDocumentNumber: "",
      itemType: "service",
      amount: 120.5,
      itemDescription: "2 entradas para Noche de sintetizadores",
      complaintType: "claim",
      detail: "No recibí las entradas.",
      request: "Que me envíen las entradas.",
    });

    await act(async () => resolveSubmit(RECEIPT));

    const title = await screen.findByRole("heading", { level: 2, name: "Registramos tu reclamo" });
    await waitFor(() => expect(document.activeElement).toBe(title));
    expect(screen.getByText("LR-2026-000001")).toBeTruthy();
    expect(screen.getByText("luis@correo.pe", { selector: "strong" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Imprimir hoja" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Volver al inicio" }).getAttribute("href")).toBe("/");
    expect(screen.queryByRole("button", { name: /Enviar hoja de reclamación/ })).toBeNull();
  });

  it("si el service falla, muestra el Alert y conserva los valores", async () => {
    vi.mocked(submitComplaint).mockRejectedValue(new Error("boom"));
    render(<ComplaintForm />);

    fillValid();
    fireEvent.click(submitButton());

    expect((await screen.findByRole("alert")).textContent).toBe(
      "No pudimos registrar tu hoja de reclamación. Inténtalo de nuevo.",
    );
    expect(textbox("Nombres").value).toBe("Luis");
    expect(textbox("Detalle").value).toBe("No recibí las entradas.");
    expect(screen.getByRole("radio", { name: "Reclamo" }).getAttribute("aria-checked")).toBe("true");
    expect(submitButton().textContent).toBe("Enviar hoja de reclamación");
    expect(submitButton().disabled).toBe(false);
  });
});
