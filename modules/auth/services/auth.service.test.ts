import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RegisterInput } from "../types/auth.types";
import { AuthError, MOCK_LATENCY_MS, login, register } from "./auth.service";

// Avanza la latencia simulada y devuelve el resultado (o el error) de la promesa.
async function settle<T>(promise: Promise<T>) {
  const result = promise.then(
    (value) => ({ value, error: undefined }),
    (error: unknown) => ({ value: undefined, error }),
  );
  await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MS);
  return result;
}

const registerInput: RegisterInput = {
  firstName: "Luis",
  lastName: "Ramos",
  email: "luis@correo.pe",
  phone: "912345678",
  documentType: "dni",
  documentNumber: "12345678",
  password: "Clave2026",
  confirmPassword: "Clave2026",
  acceptTerms: true,
  marketingOptIn: false,
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("login", () => {
  it("devuelve el usuario de prueba sin contraseña (correo en mayúsculas y con espacios)", async () => {
    const { value } = await settle(
      login({ email: "  DEMO@MentecTickets.pe ", password: "Mentec2026" }),
    );
    expect(value).toEqual({
      id: "usr-001",
      firstName: "Ana",
      lastName: "Quispe",
      email: "demo@mentectickets.pe",
    });
    expect(value).not.toHaveProperty("password");
  });

  it.each([
    ["contraseña incorrecta", "demo@mentectickets.pe", "otra"],
    ["correo inexistente", "nadie@correo.pe", "Mentec2026"],
  ])("lanza invalid-credentials con %s", async (_, email, password) => {
    const { error } = await settle(login({ email, password }));
    expect(error).toBeInstanceOf(AuthError);
    expect(error).toMatchObject({
      code: "invalid-credentials",
      message: "Correo o contraseña incorrectos",
    });
  });

  it("no se resuelve antes de MOCK_LATENCY_MS", async () => {
    const resolved = vi.fn();
    login({ email: "demo@mentectickets.pe", password: "Mentec2026" }).then(resolved);
    await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MS - 1);
    expect(resolved).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toHaveBeenCalled();
  });
});

describe("register", () => {
  it("devuelve un AuthUser con los nombres del registro", async () => {
    const { value } = await settle(register(registerInput));
    expect(value).toMatchObject({
      firstName: "Luis",
      lastName: "Ramos",
      email: "luis@correo.pe",
    });
    expect(value?.id).toEqual(expect.any(String));
    expect(value).not.toHaveProperty("password");
  });

  it("lanza email-taken con el correo de prueba (otra capitalización)", async () => {
    const { error } = await settle(
      register({ ...registerInput, email: "Demo@MentecTickets.PE" }),
    );
    expect(error).toBeInstanceOf(AuthError);
    expect(error).toMatchObject({
      code: "email-taken",
      message: "Ya existe una cuenta con este correo",
    });
  });

  it("no se resuelve antes de MOCK_LATENCY_MS", async () => {
    const resolved = vi.fn();
    register(registerInput).then(resolved);
    await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MS - 1);
    expect(resolved).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toHaveBeenCalled();
  });
});
