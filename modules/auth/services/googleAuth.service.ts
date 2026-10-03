import { GOOGLE_DEMO_ACCOUNT } from "../data/googleAccount.mock";
import { authUserSchema } from "../schemas/auth.schema";
import type { AuthUser } from "../types/auth.types";
import { MOCK_LATENCY_MS } from "./auth.service";

// Mock: la integración real recibirá la credencial de Google Identity Services y la validará en el backend.
export async function signInWithGoogle(): Promise<AuthUser> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  return authUserSchema.parse(GOOGLE_DEMO_ACCOUNT);
}
