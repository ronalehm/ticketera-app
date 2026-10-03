import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "./auth.store";

const user = { id: "usr-001", firstName: "Ana", lastName: "Quispe", email: "demo@mentectickets.pe" };
const stored = () => JSON.parse(localStorage.getItem("mentec-auth") ?? "null");

beforeEach(() => {
  useAuthStore.setState({ user: null });
  localStorage.clear(); // setState también persiste
});

describe("useAuthStore", () => {
  it("signIn guarda el usuario y lo persiste en mentec-auth", () => {
    useAuthStore.getState().signIn(user);
    expect(useAuthStore.getState().user).toEqual(user);
    expect(stored().state).toEqual({ user });
  });

  it("signOut borra el usuario", () => {
    useAuthStore.getState().signIn(user);
    useAuthStore.getState().signOut();
    expect(useAuthStore.getState().user).toBeNull();
    expect(stored().state.user).toBeNull();
  });

  it("persist.rehydrate restaura el usuario guardado", async () => {
    localStorage.setItem("mentec-auth", JSON.stringify({ state: { user }, version: 0 }));
    expect(useAuthStore.getState().user).toBeNull();
    await useAuthStore.persist.rehydrate();
    expect(useAuthStore.getState().user).toEqual(user);
  });
});
