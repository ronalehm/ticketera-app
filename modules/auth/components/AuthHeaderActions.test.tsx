import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { AuthHeaderActions } from "./AuthHeaderActions";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
const clerk = vi.hoisted(() => ({
  isLoaded: true,
  user: null as null | {
    id: string;
    firstName: string;
    lastName: string;
    primaryEmailAddress: { emailAddress: string };
    publicMetadata: { role?: string };
  },
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isLoaded: clerk.isLoaded, user: clerk.user }),
  useClerk: () => ({ signOut: clerk.signOut }),
}));
vi.mock("../actions/session.actions", () => ({ syncSessionRoleAction: vi.fn(async () => ({ changed: false })) }));

const clerkUser = {
  id: "user_1",
  firstName: "Ana",
  lastName: "Quispe",
  primaryEmailAddress: { emailAddress: "demo@mentectickets.pe" },
};

function signIn(role = "organizer") {
  clerk.user = { ...clerkUser, publicMetadata: { role } };
}

const ACCOUNT_BUTTON = "Cuenta de Ana Quispe";

function renderSheet() {
  render(
    <Sheet defaultOpen>
      <SheetContent>
        <AuthHeaderActions variant="sheet" />
      </SheetContent>
    </Sheet>,
  );
}

beforeEach(() => {
  navigation.pathname = "/";
  clerk.isLoaded = true;
  clerk.user = null;
  clerk.signOut.mockReset().mockResolvedValue(undefined);
});

afterEach(cleanup);

describe("AuthHeaderActions (bar)", () => {
  it("sin usuario muestra Iniciar sesión y Crear cuenta, sin botón de cuenta ni Mis entradas", () => {
    render(<AuthHeaderActions variant="bar" />);
    expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe("/login");
    expect(screen.getByRole("link", { name: "Crear cuenta" }).getAttribute("href")).toBe("/registro");
    expect(screen.queryByRole("button", { name: /^Cuenta de/ })).toBeNull();
    expect(screen.queryByText("Mis entradas")).toBeNull();
  });

  it("mientras Clerk carga no muestra ni los botones de acceso ni el menú", () => {
    clerk.isLoaded = false;
    const { container } = render(<AuthHeaderActions variant="bar" />);
    expect(container.innerHTML).toBe("");
  });

  it("con sesión muestra el botón de cuenta, sin saludo ni enlaces sueltos", async () => {
    signIn();
    render(<AuthHeaderActions variant="bar" />);

    expect(await screen.findByRole("button", { name: ACCOUNT_BUTTON })).toBeTruthy();
    expect(screen.queryByText(/Hola, Ana/)).toBeNull();
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Mis entradas" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
  });

  it("Cerrar sesión desde el menú cierra la sesión de Clerk y lleva a /", async () => {
    signIn();
    render(<AuthHeaderActions variant="bar" />);
    fireEvent.click(await screen.findByRole("button", { name: ACCOUNT_BUTTON }));

    const signOutItem = await screen.findByRole("menuitem", { name: "Cerrar sesión" });
    await act(async () => {
      fireEvent.click(signOutItem);
    });

    expect(clerk.signOut).toHaveBeenCalledWith({ redirectUrl: "/" });
  });

  it("en /mis-entradas el item Mis entradas del menú tiene aria-current=page", async () => {
    navigation.pathname = "/mis-entradas";
    signIn();
    render(<AuthHeaderActions variant="bar" />);
    fireEvent.click(await screen.findByRole("button", { name: ACCOUNT_BUTTON }));

    const item = await screen.findByRole("menuitem", { name: "Mis entradas" });
    expect(item.getAttribute("href")).toBe("/mis-entradas");
    expect(item.getAttribute("aria-current")).toBe("page");
  });

  it("Mi perfil es el primer item del menú y en /perfil tiene aria-current=page", async () => {
    navigation.pathname = "/perfil";
    signIn();
    render(<AuthHeaderActions variant="bar" />);
    fireEvent.click(await screen.findByRole("button", { name: ACCOUNT_BUTTON }));

    await screen.findByRole("menu");
    const [first] = screen.getAllByRole("menuitem");
    expect(first.textContent).toBe("Mi perfil");
    expect(first.getAttribute("href")).toBe("/perfil");
    expect(first.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("menuitem", { name: "Mis entradas" }).getAttribute("aria-current")).toBeNull();
  });
});

describe("AuthHeaderActions (sheet)", () => {
  it("con sesión muestra la tarjeta, la navegación Tu cuenta y Cerrar sesión cierra la sesión de Clerk", async () => {
    navigation.pathname = "/mis-entradas";
    signIn();
    renderSheet();

    expect(await screen.findByText("Ana Quispe")).toBeTruthy();
    expect(screen.getByText("demo@mentectickets.pe")).toBeTruthy();

    const nav = screen.getByRole("navigation", { name: "Tu cuenta" });
    // SheetClose con nativeButton={false} renderiza un <a> con role="button" (Base UI).
    const links = within(nav).getAllByRole("button");
    expect(links.map((link) => link.textContent)).toEqual(["Mi perfil", "Mis entradas", "Panel de organizador"]);
    expect(links[0].getAttribute("href")).toBe("/perfil");
    expect(links[0].getAttribute("aria-current")).toBeNull();

    const myTickets = within(nav).getByRole("button", { name: "Mis entradas" });
    expect(myTickets.tagName).toBe("A");
    expect(myTickets.getAttribute("href")).toBe("/mis-entradas");
    expect(myTickets.getAttribute("aria-current")).toBe("page");

    const organizer = within(nav).getByRole("button", { name: "Panel de organizador" });
    expect(organizer.tagName).toBe("A");
    expect(organizer.getAttribute("href")).toBe("/organizador");
    expect(organizer.getAttribute("aria-current")).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    });
    expect(clerk.signOut).toHaveBeenCalledWith({ redirectUrl: "/" });
  });

  it("en /perfil el primer enlace de Tu cuenta es Mi perfil con aria-current=page", async () => {
    navigation.pathname = "/perfil";
    signIn();
    renderSheet();

    const nav = await screen.findByRole("navigation", { name: "Tu cuenta" });
    const [first] = within(nav).getAllByRole("button");
    expect(first.tagName).toBe("A");
    expect(first.textContent).toBe("Mi perfil");
    expect(first.getAttribute("href")).toBe("/perfil");
    expect(first.getAttribute("aria-current")).toBe("page");
    expect(within(nav).getByRole("button", { name: "Mis entradas" }).getAttribute("aria-current")).toBeNull();
  });

  it("un cliente (o sin rol en publicMetadata) no ve el enlace al panel", async () => {
    for (const role of ["customer", "rol-desconocido"]) {
      signIn(role);
      renderSheet();
      const nav = await screen.findByRole("navigation", { name: "Tu cuenta" });
      expect(within(nav).getAllByRole("button").map((link) => link.textContent)).toEqual(["Mi perfil", "Mis entradas"]);
      cleanup();
    }
  });

  it.each(["admin", "super_admin"])("un %s ve el enlace Panel → /admin/usuarios", async (role) => {
    signIn(role);
    renderSheet();
    const nav = await screen.findByRole("navigation", { name: "Tu cuenta" });
    expect(within(nav).getByRole("button", { name: "Panel" }).getAttribute("href")).toBe("/admin/usuarios");
  });

  it("sin usuario muestra Iniciar sesión y Crear cuenta, sin Tu cuenta ni Mis entradas", async () => {
    renderSheet();
    expect(await screen.findByRole("button", { name: "Iniciar sesión" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Crear cuenta" })).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Tu cuenta" })).toBeNull();
    expect(screen.queryByText("Mis entradas")).toBeNull();
  });
});
