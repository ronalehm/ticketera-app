import { MOCK_USERS } from "../data/users.mock";
import { authUserSchema } from "../schemas/auth.schema";
import type { AuthUser, LoginInput, RegisterInput } from "../types/auth.types";

// Mock por ahora: se reemplazará por la llamada a la API sin cambiar la firma.
export const MOCK_LATENCY_MS = 600;

export class AuthError extends Error {
  constructor(
    public code: "invalid-credentials" | "email-taken",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const wait = () => new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const findUser = (email: string) =>
  MOCK_USERS.find((user) => normalizeEmail(user.email) === normalizeEmail(email));

export async function login(input: LoginInput): Promise<AuthUser> {
  await wait();
  const user = findUser(input.email);
  // Mismo mensaje para correo inexistente y contraseña incorrecta: no revela qué cuentas existen.
  if (!user || user.password !== input.password) {
    throw new AuthError("invalid-credentials", "Correo o contraseña incorrectos");
  }
  return authUserSchema.parse(user);
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  await wait();
  if (findUser(input.email)) {
    throw new AuthError("email-taken", "Ya existe una cuenta con este correo");
  }
  return authUserSchema.parse({
    id: crypto.randomUUID(),
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
  });
}
