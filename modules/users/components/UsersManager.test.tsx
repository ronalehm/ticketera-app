import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteUserAction,
  inviteUserAction,
  listUsersAction,
  setOrganizerStatusAction,
  updateUserAction,
} from "../actions/users.actions";
import { DEFAULT_USERS_FILTERS as DEFAULTS } from "../schemas/users.schema";
import type { UserListItem, UserRole, UsersPage } from "../types/users.types";
import { UsersManager } from "./UsersManager";

vi.mock("../actions/users.actions", () => ({
  listUsersAction: vi.fn(),
  inviteUserAction: vi.fn(),
  updateUserAction: vi.fn(),
  setOrganizerStatusAction: vi.fn(),
  deleteUserAction: vi.fn(),
}));

const ADMIN = { id: "11111111-1111-4111-8111-111111111111", role: "admin" as const };

function makeUser(id: string, overrides: Partial<UserListItem> = {}): UserListItem {
  return {
    id,
    firstName: "Ana",
    lastName: id,
    email: `${id}@example.com`,
    role: "customer",
    organizerStatus: null,
    legalName: null,
    taxIdType: null,
    taxId: null,
    createdAt: "2026-10-01T15:00:00.000Z",
    hasClerkAccount: true,
    ...overrides,
  };
}

const TAX_DATA = { legalName: "Productora SAC", taxIdType: "ruc" as const, taxId: "20123456789" };

const USERS = [
  makeUser(ADMIN.id, { firstName: "Ada", lastName: "Admin", role: "admin" }),
  makeUser("super", { firstName: "Sara", lastName: "Super", role: "super_admin" }),
  makeUser("otro-admin", { firstName: "Alan", lastName: "Otro", role: "admin" }),
  makeUser("org-ok", { firstName: "Oscar", lastName: "Aprobado", role: "organizer", organizerStatus: "approved", ...TAX_DATA }),
  makeUser("org-sin-datos", { firstName: "Olga", lastName: "Pendiente", role: "organizer", organizerStatus: "pending" }),
  makeUser("org-con-datos", {
    firstName: "Omar",
    lastName: "Suspendido",
    role: "organizer",
    organizerStatus: "suspended",
    ...TAX_DATA,
    taxId: "20999999999",
  }),
  makeUser("invitado", { firstName: "", lastName: "", email: "nuevo@example.com", role: "organizer", organizerStatus: "pending", hasClerkAccount: false }),
  // Ex organizador: conserva su fila `suspended`, pero como cliente no muestra estado de organizador.
  makeUser("cliente", { firstName: "Carla", lastName: "Cliente", organizerStatus: "suspended" }),
];

const PAGE: UsersPage = { items: USERS, total: USERS.length, page: 1, pageSize: 8 };

function renderManager(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const renderDefault = (actor: { id: string; role: UserRole } = ADMIN, data: UsersPage = PAGE) =>
  renderManager(<UsersManager actor={actor} initialData={data} />);

/** Tarjetas (< lg); la tabla tiene las mismas filas y en jsdom ambas están en el árbol. */
const cards = () => within(screen.getByRole("list", { name: "Listado" }));
const card = (name: string) => within(cards().getByRole("heading", { name }).closest("li") as HTMLElement);

beforeEach(() => {
  vi.mocked(listUsersAction).mockResolvedValue({ ok: true, data: PAGE });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("UsersManager: listado", () => {
  it("muestra los usuarios del servidor sin pedirlos otra vez, con badges de rol y de estado", () => {
    renderDefault();

    expect(listUsersAction).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Usuarios y roles" })).toBeTruthy();
    expect(screen.getByText("8 usuarios registrados")).toBeTruthy();

    expect(card("Sara Super").getByText("Super admin")).toBeTruthy();
    expect(card("Alan Otro").getByText("Administrador")).toBeTruthy();
    expect(card("Oscar Aprobado").getByText("Organizador")).toBeTruthy();
    expect(card("Oscar Aprobado").getByText("Aprobado")).toBeTruthy();
    expect(card("Olga Pendiente").getByText("Pendiente")).toBeTruthy();
    expect(card("Omar Suspendido").getByText("Suspendido")).toBeTruthy();
    expect(card("Carla Cliente").getByText("Cliente")).toBeTruthy();
    expect(card("Carla Cliente").queryByText("Suspendido")).toBeNull();
    expect(card("Carla Cliente").getByText("Registro: 1 oct 2026")).toBeTruthy();
  });

  it("marca la propia cuenta con «Tú» y muestra el motivo en vez de las acciones", () => {
    renderDefault();

    const self = card("Ada Admin");
    expect(self.getByText("Tú")).toBeTruthy();
    expect(self.getByText("Tu cuenta")).toBeTruthy();
    expect(self.queryByRole("button")).toBeNull();
    expect(card("Sara Super").getByText("Cuenta protegida")).toBeTruthy();
    expect(card("Alan Otro").getByText("Solo el super admin")).toBeTruthy();
    expect(card("Alan Otro").queryByRole("button")).toBeNull();
    expect(cards().getAllByText("Tú")).toHaveLength(1);
  });

  it("un super admin gestiona a otro admin, pero no a otro super admin", () => {
    renderDefault({ id: "super", role: "super_admin" });

    expect(card("Alan Otro").getByRole("button", { name: "Editar a Alan Otro" })).toBeTruthy();
    expect(card("Sara Super").getByText("Tu cuenta")).toBeTruthy();
    expect(card("Ada Admin").getByRole("button", { name: "Eliminar a Ada Admin" })).toBeTruthy();
  });

  it("un invitado sin nombre se muestra por su correo", () => {
    renderDefault();
    expect(card("nuevo@example.com").getByRole("button", { name: "Editar a nuevo@example.com" })).toBeTruthy();
  });

  it("marca «Invitación pendiente» en la tabla y en la tarjeta solo a quien aún no tiene cuenta de Clerk", () => {
    renderDefault();

    expect(card("nuevo@example.com").getByText("Invitación pendiente")).toBeTruthy();
    expect(cards().getAllByText("Invitación pendiente")).toHaveLength(1);

    const table = within(screen.getByRole("table", { name: "Listado" }));
    const [badge] = table.getAllByText("Invitación pendiente");
    expect(table.getAllByText("Invitación pendiente")).toHaveLength(1);
    expect(within(badge.closest("tr") as HTMLElement).getByText("nuevo@example.com")).toBeTruthy();
  });

  it("Aprobar o Suspender solo en organizadores; Aprobar sin datos fiscales queda deshabilitado con el motivo", () => {
    renderDefault();

    expect(card("Oscar Aprobado").getByRole("button", { name: "Suspender a Oscar Aprobado" })).toBeTruthy();
    expect(card("Omar Suspendido").getByRole("button", { name: "Aprobar a Omar Suspendido" }).getAttribute("aria-disabled")).not.toBe("true");

    const approve = card("Olga Pendiente").getByRole("button", { name: "Aprobar a Olga Pendiente" });
    expect(approve.getAttribute("aria-disabled")).toBe("true");
    expect(approve.getAttribute("aria-describedby")).toBeTruthy();
    expect(document.getElementById(approve.getAttribute("aria-describedby")!)?.textContent).toBe("Faltan datos fiscales");

    expect(card("Carla Cliente").queryByRole("button", { name: /Aprobar|Suspender/ })).toBeNull();
    expect(card("Carla Cliente").getByRole("button", { name: "Editar a Carla Cliente" })).toBeTruthy();
  });
});

describe("UsersManager: filtros y paginación", () => {
  it("el filtro de rol ofrece todos los roles y pide la página 1 filtrada", async () => {
    renderDefault();

    const role = screen.getByLabelText("Rol") as HTMLSelectElement;
    expect([...role.options].map((option) => option.text)).toEqual([
      "Todos los roles",
      "Super admin",
      "Administrador",
      "Organizador",
      "Cliente",
    ]);
    fireEvent.change(role, { target: { value: "organizer" } });

    await waitFor(() => expect(listUsersAction).toHaveBeenCalledWith({ ...DEFAULTS, role: "organizer" }));
  });

  it("el filtro de estado de organizador pide los de ese estado", async () => {
    renderDefault();

    const status = screen.getByLabelText("Estado de organizador") as HTMLSelectElement;
    expect([...status.options].map((option) => option.text)).toEqual(["Todos", "Aprobado", "Pendiente", "Suspendido"]);
    fireEvent.change(status, { target: { value: "pending" } });

    await waitFor(() => expect(listUsersAction).toHaveBeenCalledWith({ ...DEFAULTS, organizerStatus: "pending" }));
  });

  it("busca al enviar, sin espacios sobrantes; «Limpiar» aparece con filtros y los quita", async () => {
    renderDefault();

    expect(screen.queryByRole("button", { name: "Limpiar" })).toBeNull();
    const search = screen.getByLabelText("Buscar") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "  ana " } });
    expect(listUsersAction).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByRole("search"));

    await waitFor(() => expect(listUsersAction).toHaveBeenCalledWith({ ...DEFAULTS, q: "ana" }));
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(search.value).toBe("");
    expect(screen.queryByRole("button", { name: "Limpiar" })).toBeNull();
    // Sin filtros vuelven los datos del servidor: no se pide nada más.
    expect(listUsersAction).toHaveBeenCalledTimes(1);
  });

  it("pagina con ventana de 5 números, anterior y siguiente, y cambia las filas por página", async () => {
    const first: UsersPage = { items: USERS, total: 50, page: 1, pageSize: 8 };
    vi.mocked(listUsersAction).mockImplementation(async (input) => {
      const filters = input as typeof DEFAULTS;
      return { ok: true, data: { items: USERS, total: 50, page: filters.page, pageSize: filters.pageSize } };
    });
    renderDefault(ADMIN, first);

    const nav = within(screen.getByRole("navigation", { name: "Paginación de usuarios" }));
    expect(nav.getAllByRole("button", { name: /^Página \d+$/ }).map((button) => button.textContent)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    expect(nav.getByRole("button", { name: "Página 1" }).getAttribute("aria-current")).toBe("page");
    expect(nav.getByRole("button", { name: "Página anterior" }).getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText("Mostrando 1–8 de 50")).toBeTruthy();

    fireEvent.click(nav.getByRole("button", { name: "Página 5" }));
    await waitFor(() => expect(listUsersAction).toHaveBeenCalledWith({ ...DEFAULTS, page: 5 }));
    await waitFor(() => expect(nav.getByRole("button", { name: "Página 5" }).getAttribute("aria-current")).toBe("page"));
    expect(nav.getAllByRole("button", { name: /^Página \d+$/ }).map((button) => button.textContent)).toEqual([
      "3",
      "4",
      "5",
      "6",
      "7",
    ]);
    expect(screen.getByText("Mostrando 33–40 de 50")).toBeTruthy();

    fireEvent.click(nav.getByRole("button", { name: "Página siguiente" }));
    await waitFor(() => expect(listUsersAction).toHaveBeenCalledWith({ ...DEFAULTS, page: 6 }));

    const rows = screen.getByLabelText("Filas") as HTMLSelectElement;
    expect([...rows.options].map((option) => option.text)).toEqual(["8", "16", "24"]);
    fireEvent.change(rows, { target: { value: "16" } });
    await waitFor(() => expect(listUsersAction).toHaveBeenCalledWith({ ...DEFAULTS, pageSize: 16 }));
  });

  it("si la página pedida ya no existe (p. ej. tras eliminar), pasa a la última que queda", async () => {
    vi.mocked(listUsersAction).mockResolvedValue({ ok: true, data: { items: [], total: 8, page: 2, pageSize: 8 } });
    renderDefault(ADMIN, { items: USERS, total: 16, page: 1, pageSize: 8 });

    fireEvent.click(screen.getByRole("button", { name: "Página 2" }));

    await waitFor(() => expect(listUsersAction).toHaveBeenCalledWith({ ...DEFAULTS, page: 2 }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Página 1" }).getAttribute("aria-current")).toBe("page"),
    );
    expect(cards().getAllByRole("listitem")).toHaveLength(USERS.length);
  });

  it("en la última página, «Página siguiente» queda deshabilitada", () => {
    renderDefault(ADMIN, { items: USERS, total: 8, page: 1, pageSize: 8 });
    const nav = within(screen.getByRole("navigation", { name: "Paginación de usuarios" }));
    expect(nav.getByRole("button", { name: "Página siguiente" }).getAttribute("aria-disabled")).toBe("true");
    expect(nav.getAllByRole("button", { name: /^Página \d+$/ })).toHaveLength(1);
  });

  it("sin resultados lo dice y «Limpiar filtros» los quita", async () => {
    vi.mocked(listUsersAction).mockResolvedValue({ ok: true, data: { items: [], total: 0, page: 1, pageSize: 8 } });
    renderDefault();

    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "customer" } });
    expect(await screen.findByText("Sin resultados")).toBeTruthy();
    expect(screen.getByText("Ningún usuario coincide con los filtros.")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Paginación de usuarios" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect((screen.getByLabelText("Rol") as HTMLSelectElement).value).toBe("all");
    expect(cards().getAllByRole("listitem")).toHaveLength(USERS.length);
  });

  it("si falla la carga lo anuncia y no dice que no hay resultados", async () => {
    vi.mocked(listUsersAction).mockRejectedValue(new Error("fallo"));
    renderDefault();

    fireEvent.change(screen.getByLabelText("Rol"), { target: { value: "customer" } });
    expect((await screen.findByRole("alert")).textContent).toBe("No pudimos cargar los usuarios. Inténtalo de nuevo.");
    expect(screen.queryByText("Sin resultados")).toBeNull();
  });
});

describe("UsersManager: acciones", () => {
  it("Aprobar llama a la acción y avisa del resultado; el aviso se puede cerrar", async () => {
    vi.mocked(setOrganizerStatusAction).mockResolvedValue({ ok: true });
    renderDefault();

    fireEvent.click(card("Omar Suspendido").getByRole("button", { name: "Aprobar a Omar Suspendido" }));

    await waitFor(() => expect(setOrganizerStatusAction).toHaveBeenCalledWith("org-con-datos", "approved"));
    expect(await screen.findByText("Omar Suspendido fue aprobado.")).toBeTruthy();
    // Tras el cambio se recarga el listado.
    await waitFor(() => expect(listUsersAction).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.queryByText("Omar Suspendido fue aprobado.")).toBeNull();
  });

  it("Suspender llama a la acción; un error se muestra en el aviso", async () => {
    vi.mocked(setOrganizerStatusAction).mockResolvedValue({ ok: false, error: "Esta cuenta está protegida." });
    renderDefault();

    fireEvent.click(card("Oscar Aprobado").getByRole("button", { name: "Suspender a Oscar Aprobado" }));

    await waitFor(() => expect(setOrganizerStatusAction).toHaveBeenCalledWith("org-ok", "suspended"));
    expect(await screen.findByText("Esta cuenta está protegida.")).toBeTruthy();
  });

  it("Eliminar pide confirmación y solo entonces elimina", async () => {
    vi.mocked(deleteUserAction).mockResolvedValue({ ok: true });
    renderDefault();

    fireEvent.click(card("Carla Cliente").getByRole("button", { name: "Eliminar a Carla Cliente" }));
    const dialog = await screen.findByRole("alertdialog", { name: "¿Eliminar a Carla Cliente?" });
    expect(within(dialog).getByText("Perderá el acceso a Mentec Tickets. Esta acción no se puede deshacer.")).toBeTruthy();
    expect(deleteUserAction).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(deleteUserAction).toHaveBeenCalledWith("cliente"));
    expect(await screen.findByText("Carla Cliente fue eliminado.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("Cancelar no elimina; un fallo se muestra en el diálogo para reintentar", async () => {
    vi.mocked(deleteUserAction).mockResolvedValueOnce({
      ok: false,
      error: "No pudimos conectar con el servicio de cuentas. Inténtalo de nuevo.",
    });
    renderDefault();

    fireEvent.click(card("Carla Cliente").getByRole("button", { name: "Eliminar a Carla Cliente" }));
    let dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(deleteUserAction).not.toHaveBeenCalled();

    fireEvent.click(card("Carla Cliente").getByRole("button", { name: "Eliminar a Carla Cliente" }));
    dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    expect(
      await within(dialog).findByText("No pudimos conectar con el servicio de cuentas. Inténtalo de nuevo."),
    ).toBeTruthy();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });

  it("Invitar abre el diálogo y avisa del resultado", async () => {
    vi.mocked(inviteUserAction).mockResolvedValue({ ok: true, outcome: "invited" });
    renderDefault();

    fireEvent.click(screen.getByRole("button", { name: "Invitar usuario" }));
    const dialog = await screen.findByRole("dialog", { name: "Invitar usuario" });
    fireEvent.change(within(dialog).getByLabelText("Correo"), { target: { value: "Nueva@Example.com" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar invitación" }));

    await waitFor(() =>
      expect(inviteUserAction).toHaveBeenCalledWith({ email: "nueva@example.com", role: "organizer" }),
    );
    expect(await screen.findByText("Invitación enviada a nueva@example.com.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("Editar abre el diálogo con los datos del usuario y avisa al guardar", async () => {
    vi.mocked(updateUserAction).mockResolvedValue({ ok: true });
    renderDefault();

    fireEvent.click(card("Carla Cliente").getByRole("button", { name: "Editar a Carla Cliente" }));
    const dialog = await screen.findByRole("dialog", { name: "Editar usuario" });
    expect((within(dialog).getByLabelText("Nombre") as HTMLInputElement).value).toBe("Carla");
    fireEvent.change(within(dialog).getByLabelText("Nombre"), { target: { value: "Carlota" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(updateUserAction).toHaveBeenCalledWith("cliente", { firstName: "Carlota", lastName: "Cliente", role: "customer" }),
    );
    expect(await screen.findByText("Cambios guardados para Carlota Cliente.")).toBeTruthy();
  });
});
