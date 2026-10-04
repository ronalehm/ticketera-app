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

  it("convierte los nombres nulos en cadena vacía", () => {
    clerkMock.useUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: { firstName: null, lastName: null, primaryEmailAddress: { emailAddress: "ana@example.com" } },
    });
    const { result } = renderHook(() => useSessionUser());
    expect(result.current.user).toEqual({ firstName: "", lastName: "", email: "ana@example.com" });
  });

  it("signOut cierra la sesión de Clerk y lleva a /", async () => {
    clerkMock.useUser.mockReturnValue({ isLoaded: true, isSignedIn: false, user: null });
    const { result } = renderHook(() => useSessionUser());
    await result.current.signOut();
    expect(clerkMock.signOut).toHaveBeenCalledWith({ redirectUrl: "/" });
  });
});
