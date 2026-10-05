import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSessionUser } from "./useSessionUser";

const clerkMock = vi.hoisted(() => ({
  useUser: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: clerkMock.useUser,
  useClerk: () => ({ signOut: clerkMock.signOut }),
}));

describe("useSessionUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mientras Clerk carga devuelve isLoaded false y sin usuario", () => {
    clerkMock.useUser.mockReturnValue({ isLoaded: false, isSignedIn: undefined, user: undefined });
    const { result } = renderHook(() => useSessionUser());
    expect(result.current).toMatchObject({ isLoaded: false, user: null });
  });

  it("sin sesión devuelve isLoaded true y sin usuario", () => {
    clerkMock.useUser.mockReturnValue({ isLoaded: true, isSignedIn: false, user: null });
    const { result } = renderHook(() => useSessionUser());
    expect(result.current).toMatchObject({ isLoaded: true, user: null });
  });

  it("con sesión devuelve nombre, apellido y correo primario", () => {
    clerkMock.useUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        firstName: "Ana",
        lastName: "Quispe",
        primaryEmailAddress: { emailAddress: "ana@example.com" },
      },
    });
    const { result } = renderHook(() => useSessionUser());
    expect(result.current).toMatchObject({
      isLoaded: true,
      user: { firstName: "Ana", lastName: "Quispe", email: "ana@example.com" },
    });
  });

  it("convierte los nombres nulos en cadena vacía y, sin rol en publicMetadata, usa customer", () => {
    clerkMock.useUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { firstName: null, lastName: null, primaryEmailAddress: { emailAddress: "ana@example.com" } },
    });
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
    clerkMock.useUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        firstName: "Ana",
        lastName: "Quispe",
        primaryEmailAddress: { emailAddress: "ana@example.com" },
        publicMetadata: { role: value },
      },
    });
    const { result } = renderHook(() => useSessionUser());
    expect(result.current.user?.role).toBe(expected);
  });

  it("signOut cierra la sesión de Clerk y lleva a /", async () => {
    clerkMock.useUser.mockReturnValue({ isLoaded: true, isSignedIn: false, user: null });
    const { result } = renderHook(() => useSessionUser());
    await result.current.signOut();
    expect(clerkMock.signOut).toHaveBeenCalledWith({ redirectUrl: "/" });
  });
});
