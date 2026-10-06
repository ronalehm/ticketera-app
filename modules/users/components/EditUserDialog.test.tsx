import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { updateUserAction } from "../actions/users.actions";
import type { UserListItem, UserRole } from "../types/users.types";
import { EditUserDialog } from "./EditUserDialog";

vi.mock("../actions/users.actions", () => ({
  listUsersAction: vi.fn().mockResolvedValue({ ok: true, data: { items: [], total: 0, page: 1, pageSize: 8 } }),
  updateUserAction: vi.fn(),
}));

const CUSTOMER: UserListItem = {
  id: "22222222-2222-4222-8222-222222222222",
  firstName: "Carla",
  lastName: "Cliente",
  email: "carla@example.com",
  role: "customer",
  // Ex organizadora: conserva su fila `suspended` y sus datos fiscales.
  organizerStatus: "suspended",
  legalName: "Carla Eventos SAC",
  taxIdType: "ruc",
  taxId: "20123456789",
  createdAt: "2026-10-01T15:00:00.000Z",
  hasClerkAccount: true,
};

const ORGANIZER: UserListItem = {
  ...CUSTOMER,
  firstName: "Olga",
  lastName: "Pendiente",
  role: "organizer",
  organizerStatus: "pending",
  legalName: null,
  taxIdType: null,
  taxId: null,
};

function renderDialog(user: UserListItem, actorRole: UserRole = "admin") {
  const onSaved = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <EditUserDialog actor={{ id: "actor", role: actorRole }} user={user} open onOpenChange={vi.fn()} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  const dialog = within(screen.getByRole("dialog", { name: "Editar usuario" }));
  return { dialog, onSaved };
}

const options = (select: HTMLElement) => [...(select as HTMLSelectElement).options].map((option) => option.text);
const save = (dialog: ReturnType<typeof within>) => fireEvent.click(dialog.getByRole("button", { name: "Guardar cambios" }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EditUserDialog", () => {
  it("precarga los datos; el correo no se edita y los campos fiscales solo aparecen con rol organizador", () => {
    const { dialog } = renderDialog(CUSTOMER);

    expect((dialog.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Carla");
    expect((dialog.getByLabelText("Apellido") as HTMLInputElement).value).toBe("Cliente");
    const email = dialog.getByLabelText("Correo") as HTMLInputElement;
    expect(email.value).toBe("carla@example.com");
    expect(email.disabled).toBe(true);
    expect(dialog.getByText("El correo viene de la cuenta y no se edita.")).toBeTruthy();
    expect(dialog.queryByLabelText("Razón social")).toBeNull();

    fireEvent.change(dialog.getByLabelText("Rol"), { target: { value: "organizer" } });

    expect((dialog.getByLabelText("Razón social") as HTMLInputElement).value).toBe("Carla Eventos SAC");
    expect(options(dialog.getByLabelText("Tipo de documento fiscal"))).toEqual(["Elige el tipo", "RUC", "DNI"]);
    expect((dialog.getByLabelText("RUC/DNI") as HTMLInputElement).value).toBe("20123456789");
    // Quien pasa a organizador empieza pendiente, aunque su fila antigua esté suspendida.
    const status = dialog.getByLabelText("Estado de organizador") as HTMLSelectElement;
    expect(options(status)).toEqual(["Aprobado", "Pendiente", "Suspendido"]);
    expect(status.value).toBe("pending");
  });

  it("los roles dependen del actor: Administrador solo para un super admin", () => {
    const { dialog } = renderDialog(CUSTOMER, "admin");
    expect(options(dialog.getByLabelText("Rol"))).toEqual(["Cliente", "Organizador"]);
    cleanup();

    const superAdmin = renderDialog(CUSTOMER, "super_admin");
    expect(options(superAdmin.dialog.getByLabelText("Rol"))).toEqual(["Cliente", "Organizador", "Administrador"]);
  });

  it("aprobar sin datos fiscales muestra un error en cada campo y no envía", async () => {
    const { dialog } = renderDialog(ORGANIZER);
    // Al abrir, el diálogo enfoca el primer campo.
    await waitFor(() => expect(document.activeElement).toBe(dialog.getByLabelText("Nombre")));

    fireEvent.change(dialog.getByLabelText("Estado de organizador"), { target: { value: "approved" } });
    save(dialog);

    expect(await dialog.findByText("Ingresa la razón social para aprobar")).toBeTruthy();
    expect(dialog.getByText("Elige el tipo de documento fiscal para aprobar")).toBeTruthy();
    expect(dialog.getByText("Ingresa el RUC o DNI para aprobar")).toBeTruthy();
    expect(dialog.getByLabelText("Razón social").getAttribute("aria-invalid")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(dialog.getByLabelText("Razón social")));
    expect(updateUserAction).not.toHaveBeenCalled();
  });

  it("la ayuda de aprobar describe el select de estado (aria-describedby), también junto a su error", async () => {
    vi.mocked(updateUserAction).mockResolvedValue({
      ok: false,
      error: "Elige un estado válido",
      fieldErrors: { "organizer.status": ["Elige un estado válido"] },
    });
    const { dialog } = renderDialog(ORGANIZER);
    const status = dialog.getByLabelText("Estado de organizador");
    const describedBy = () =>
      (status.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent);

    expect(describedBy()).toEqual(["Para aprobar hacen falta la razón social, el tipo y el número fiscal."]);

    save(dialog);
    await waitFor(() => expect(status.getAttribute("aria-invalid")).toBe("true"));
    expect(describedBy()).toEqual([
      "Para aprobar hacen falta la razón social, el tipo y el número fiscal.",
      "Elige un estado válido",
    ]);
  });

  it("mientras guarda, Cancelar y Guardar quedan deshabilitados", async () => {
    let resolve: (value: { ok: true }) => void = () => {};
    vi.mocked(updateUserAction).mockReturnValue(new Promise((done) => (resolve = done)));
    const { dialog, onSaved } = renderDialog(CUSTOMER);

    save(dialog);

    await waitFor(() => expect((dialog.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement).disabled).toBe(true));
    expect((dialog.getByRole("button", { name: "Guardando…" }) as HTMLButtonElement).disabled).toBe(true);
    resolve({ ok: true });
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("valida el número según el tipo fiscal", async () => {
    const { dialog } = renderDialog(ORGANIZER);

    fireEvent.change(dialog.getByLabelText("Tipo de documento fiscal"), { target: { value: "ruc" } });
    fireEvent.change(dialog.getByLabelText("RUC/DNI"), { target: { value: "123" } });
    save(dialog);

    expect(await dialog.findByText("El RUC debe tener 11 dígitos")).toBeTruthy();
    expect(updateUserAction).not.toHaveBeenCalled();
  });

  it("envía los datos de organizador y devuelve el nombre actualizado", async () => {
    vi.mocked(updateUserAction).mockResolvedValue({ ok: true });
    const { dialog, onSaved } = renderDialog(ORGANIZER);

    fireEvent.change(dialog.getByLabelText("Razón social"), { target: { value: "Olga Producciones SAC" } });
    fireEvent.change(dialog.getByLabelText("Tipo de documento fiscal"), { target: { value: "ruc" } });
    fireEvent.change(dialog.getByLabelText("RUC/DNI"), { target: { value: "20555555555" } });
    fireEvent.change(dialog.getByLabelText("Estado de organizador"), { target: { value: "approved" } });
    save(dialog);

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("Olga Pendiente"));
    expect(updateUserAction).toHaveBeenCalledWith(ORGANIZER.id, {
      firstName: "Olga",
      lastName: "Pendiente",
      role: "organizer",
      organizer: { legalName: "Olga Producciones SAC", taxIdType: "ruc", taxId: "20555555555", status: "approved" },
    });
  });

  it("sin rol organizador no envía datos fiscales", async () => {
    vi.mocked(updateUserAction).mockResolvedValue({ ok: true });
    const { dialog, onSaved } = renderDialog(ORGANIZER);

    fireEvent.change(dialog.getByLabelText("Rol"), { target: { value: "customer" } });
    expect(dialog.queryByLabelText("Razón social")).toBeNull();
    save(dialog);

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(updateUserAction).toHaveBeenCalledWith(ORGANIZER.id, { firstName: "Olga", lastName: "Pendiente", role: "customer" });
  });

  it("muestra los errores de campo del servidor en su campo (organizer.taxId) y el error general", async () => {
    vi.mocked(updateUserAction)
      .mockResolvedValueOnce({
        ok: false,
        error: "Ese RUC/DNI ya está registrado.",
        fieldErrors: { "organizer.taxId": ["Ese RUC/DNI ya está registrado."] },
      })
      .mockResolvedValueOnce({
        ok: false,
        error:
          "No se puede quitar el rol de organizador ni eliminar la cuenta: tiene 1 evento publicado o en revisión. Primero devuelve a borrador o cancela esos eventos y liquida los pagos pendientes.",
      });
    const { dialog, onSaved } = renderDialog(ORGANIZER);

    fireEvent.change(dialog.getByLabelText("Tipo de documento fiscal"), { target: { value: "dni" } });
    fireEvent.change(dialog.getByLabelText("RUC/DNI"), { target: { value: "12345678" } });
    save(dialog);

    const taxId = dialog.getByLabelText("RUC/DNI");
    await waitFor(() => expect(taxId.getAttribute("aria-invalid")).toBe("true"));
    expect(document.getElementById(taxId.getAttribute("aria-describedby")!)?.textContent).toBe(
      "Ese RUC/DNI ya está registrado.",
    );

    fireEvent.change(dialog.getByLabelText("Rol"), { target: { value: "customer" } });
    save(dialog);
    expect(await dialog.findByText(/No se puede quitar el rol de organizador/)).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
