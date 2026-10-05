import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncSessionRoleAction } from "../actions/session.actions";
import { useSessionUser } from "./useSessionUser";

const clerkMock = vi.hoisted(() => ({
  useUser: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: clerkMock.useUser,
  useClerk: () => ({ signOut: clerkMock.signOut }),
}));
vi.mock("../actions/session.actions", () => ({ syncSessionRoleAction: vi.fn() }));

// El `Set` de usuarios sincronizados vive en el módulo: cada test usa un id distinto para no heredarlo.
let nextId = 0;

function clerkUser(fields: Record<string, unknown> = {}) {
  return {
    id: `user_${++nextId}`,
    firstName: "Ana",
    lastName: "Quispe",
    primaryEmailAddress: { emailAddress: "ana@example.com" },
    reload: vi.fn(() => Promise.resolve()),
    ...fields,
  };
}

/** Deja terminar la cadena `then`/`catch` de la acción antes de comprobar que no recargó. */
const flushPromises = () => new Promise((resolve) => setTimeout(resolve));

function signIn(user: ReturnType<typeof clerkUser>) {
  clerkMock.useUser.mockReturnValue({ isLoaded: true, isSignedIn: true, user });
  return user;
}

describe("useSessionUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(syncSessionRoleAction).mockResolvedValue({ changed: false });
  });

  it("mientras Clerk carga devuelve isLoaded false y sin usuario, sin sincronizar el rol", () => {
    clerkMock.useUser.mockReturnValue({ isLoaded: false, isSignedIn: undefined, user: undefined });
    const { result } = renderHook(() => useSessionUser());
    expect(result.current).toMatchObject({ isLoaded: false, user: null });
    expect(syncSessionRoleAction).not.toHaveBeenCalled();
  });

  it("sin sesión devuelve isLoaded true y sin usuario, sin sincronizar el rol", () => {
    clerkMock.useUser.mockReturnValue({ isLoaded: true, isSignedIn: false, user: null });
    const { result } = renderHook(() => useSessionUser());
    expect(result.current).toMatchObject({ isLoaded: true, user: null });
    expect(syncSessionRoleAction).not.toHaveBeenCalled();
  });

  it("con sesión devuelve nombre, apellido y correo primario", () => {
    signIn(clerkUser());
    const { result } = renderHook(() => useSessionUser());
    expect(result.current).toMatchObject({
      isLoaded: true,
      user: { firstName: "Ana", lastName: "Quispe", email: "ana@example.com" },
    });
  });

  it("convierte los nombres nulos en cadena vacía y, sin rol en publicMetadata, usa customer", () => {
    signIn(clerkUser({ firstName: null, lastName: null }));
    const { result } = renderHook(() => useSessionUser());
    expect(result.current.user).toEqual({ firstName: "", lastName: "", email: "ana@example.com", role: "customer" });
  });

  it.each([
    ["organizer", "organizer"],
    ["admin", "admin"],
    ["super_admin", "super_admin"],
    ["root", "customer"],
    [42, "customer"],
  ])("publicMetadata.role %j → %s", (value, expected) => {
    signIn(clerkUser({ publicMetadata: { role: value } }));
    const { result } = renderHook(() => useSessionUser());
    expect(result.current.user?.role).toBe(expected);
  });

  it("signOut cierra la sesión de Clerk y lleva a /", async () => {
    clerkMock.useUser.mockReturnValue({ isLoaded: true, isSignedIn: false, user: null });
    const { result } = renderHook(() => useSessionUser());
    await result.current.signOut();
    expect(clerkMock.signOut).toHaveBeenCalledWith({ redirectUrl: "/" });
  });

  describe("sincronización del rol con la BD", () => {
    it("llama a la acción una sola vez por usuario aunque se re-renderice o haya varios consumidores", async () => {
      const user = signIn(clerkUser());
      const first = renderHook(() => useSessionUser());
      first.rerender();
      renderHook(() => useSessionUser());
      // Clerk entrega un objeto nuevo para el mismo usuario (p. ej. tras `reload`).
      signIn({ ...user });
      first.rerender();

      await waitFor(() => expect(syncSessionRoleAction).toHaveBeenCalledTimes(1));
      expect(syncSessionRoleAction).toHaveBeenCalledWith();
    });

    it("vuelve a llamarla para otro usuario", async () => {
      signIn(clerkUser());
      const { rerender } = renderHook(() => useSessionUser());
      signIn(clerkUser());
      rerender();

      await waitFor(() => expect(syncSessionRoleAction).toHaveBeenCalledTimes(2));
    });

    it("con changed true recarga el usuario de Clerk", async () => {
      vi.mocked(syncSessionRoleAction).mockResolvedValue({ changed: true });
      const user = signIn(clerkUser());
      renderHook(() => useSessionUser());

      await waitFor(() => expect(user.reload).toHaveBeenCalledTimes(1));
    });

    it("con changed false no recarga el usuario", async () => {
      const user = signIn(clerkUser());
      renderHook(() => useSessionUser());

      await waitFor(() => expect(syncSessionRoleAction).toHaveBeenCalledTimes(1));
      await flushPromises();
      expect(user.reload).not.toHaveBeenCalled();
    });

    it("si la acción falla lo ignora y mantiene el rol de publicMetadata", async () => {
      vi.mocked(syncSessionRoleAction).mockRejectedValue(new Error("red caída"));
      const user = signIn(clerkUser({ publicMetadata: { role: "organizer" } }));
      const { result } = renderHook(() => useSessionUser());

      await waitFor(() => expect(syncSessionRoleAction).toHaveBeenCalledTimes(1));
      await flushPromises();
      expect(user.reload).not.toHaveBeenCalled();
      expect(result.current.user?.role).toBe("organizer");
    });
  });
});
