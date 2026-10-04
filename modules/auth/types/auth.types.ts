import type { z } from "zod";
import type { authUserSchema, loginSchema, registerSchema } from "../schemas/auth.schema";

export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type DocumentType = RegisterInput["documentType"];

/** Usuario de la sesión de Clerk en el cliente (nombres ausentes → ""). */
export type SessionIdentity = { firstName: string; lastName: string; email: string };

/** Usuario de Clerk que recibe `ensureUser` (nombres ausentes → ""). */
export type ClerkIdentity = {
  clerkId: string;
  email: string; // se normaliza a minúsculas en ensureUser
  emailVerified: boolean; // primaryEmailAddress.verification.status === "verified"
  firstName: string;
  lastName: string;
};

/** Usuario de la sesión en el servidor: la fila de `users` (la BD manda). */
export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  documentType: "dni" | "ce" | "passport" | null;
  documentNumber: string | null;
  role: "customer" | "organizer" | "admin" | "super_admin";
  createdAt: Date;
};
