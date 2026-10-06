import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { inviteUserAction } from "../actions/users.actions";
import type { UserRole } from "../types/users.types";
import { InviteUserDialog } from "./InviteUserDialog";

vi.mock("../actions/users.actions", () => ({
  listUsersAction: vi.fn().mockResolvedValue({ ok: true, data: { items: [], total: 0, page: 1, pageSize: 8 } }),
  inviteUserAction: vi.fn(),
}));

function renderDialog(role: UserRole = "admin") {
  const onInvited = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <InviteUserDialog actor={{ id: "actor", role }} open onOpenChange={vi.fn()} onInvited={onInvited} />
    </QueryClientProvider>,
  );
  const dialog = within(screen.getByRole("dialog", { name: "Invitar usuario" }));
  return { dialog, onInvited };
}

const submit = (dialog: ReturnType<typeof within>) =>
  fireEvent.click(dialog.getByRole("button", { name: "Enviar invitación" }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("InviteUserDialog", () => {
  it("explica qué pasa con un correo existente y ofrece solo Organizador a un admin", () => {
    const { dialog } = renderDialog("admin");

    expect(dialog.getByText("Si el correo ya tiene cuenta, se cambia su rol. Si no, recibe una invitación.")).toBeTruthy();
    const role = dialog.getByLabelText("Rol") as HTMLSelectElement;
    expect([...role.options].map((option) => option.text)).toEqual(["Organizador"]);
  });

  it("un super admin también puede invitar administradores", () => {
    const { dialog } = renderDialog("super_admin");
    const role = dialog.getByLabelText("Rol") as HTMLSelectElement;
    expect([...role.options].map((option) => option.text)).toEqual(["Organizador", "Administrador"]);
  });

  it("valida el correo antes de enviar", async () => {
    const { dialog } = renderDialog();

    submit(dialog);
    expect(await dialog.findByText("Ingresa el correo electrónico")).toBeTruthy();
    const email = dialog.getByLabelText("Correo");
    expect(email.getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(email, { target: { value: "no-es-correo" } });
    submit(dialog);
    expect(await dialog.findByText("Ingresa un correo electrónico válido")).toBeTruthy();
    expect(inviteUserAction).not.toHaveBeenCalled();
  });

  it("envía el correo normalizado y el rol, y devuelve el resultado", async () => {
    vi.mocked(inviteUserAction).mockResolvedValue({ ok: true, outcome: "roleUpdated" });
    const { dialog, onInvited } = renderDialog("super_admin");

    fireEvent.change(dialog.getByLabelText("Correo"), { target: { value: " Admin@Example.com " } });
    fireEvent.change(dialog.getByLabelText("Rol"), { target: { value: "admin" } });
    submit(dialog);

    await waitFor(() =>
      expect(onInvited).toHaveBeenCalledWith({ email: "admin@example.com", role: "admin", outcome: "roleUpdated" }),
    );
    expect(inviteUserAction).toHaveBeenCalledWith({ email: "admin@example.com", role: "admin" });
  });

  it("mientras envía, Cancelar y Enviar quedan deshabilitados", async () => {
    let resolve: (value: { ok: true; outcome: "invited" }) => void = () => {};
    vi.mocked(inviteUserAction).mockReturnValue(new Promise((done) => (resolve = done)));
    const { dialog, onInvited } = renderDialog();

    fireEvent.change(dialog.getByLabelText("Correo"), { target: { value: "nuevo@example.com" } });
    submit(dialog);

    await waitFor(() => expect((dialog.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement).disabled).toBe(true));
    expect((dialog.getByRole("button", { name: "Enviando…" }) as HTMLButtonElement).disabled).toBe(true);
    resolve({ ok: true, outcome: "invited" });
    await waitFor(() => expect(onInvited).toHaveBeenCalled());
  });

  it("muestra el error general y los errores de campo del servidor", async () => {
    vi.mocked(inviteUserAction)
      .mockResolvedValueOnce({ ok: false, error: "Solo el super admin puede gestionar administradores." })
      .mockResolvedValueOnce({
        ok: false,
        error: "Ingresa un correo electrónico válido",
        fieldErrors: { email: ["Ingresa un correo electrónico válido"] },
      });
    const { dialog, onInvited } = renderDialog();

    fireEvent.change(dialog.getByLabelText("Correo"), { target: { value: "admin@example.com" } });
    submit(dialog);
    expect(await dialog.findByText("Solo el super admin puede gestionar administradores.")).toBeTruthy();

    submit(dialog);
    expect(await dialog.findByText("Ingresa un correo electrónico válido")).toBeTruthy();
    expect(dialog.queryByText("Solo el super admin puede gestionar administradores.")).toBeNull();
    expect(dialog.getByLabelText("Correo").getAttribute("aria-invalid")).toBe("true");
    expect(onInvited).not.toHaveBeenCalled();
  });
});
