import type { z } from "zod";
import type { completeProfileSchema } from "../schemas/auth.schema";

export type CompleteProfileInput = z.infer<typeof completeProfileSchema>;

/**
 * Usuario de la sesión de Clerk en el cliente (nombres ausentes → ""). `role` sale de `publicMetadata.role` (copia del
 * rol de la BD): solo sirve para mostrar u ocultar enlaces, nunca para autorizar.
 */
export type SessionIdentity = { firstName: string; lastName: string; email: string; role: SessionUser["role"] };

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
  /** La sesión de Clerk verificó el segundo factor (`auth().factorVerificationAge[1] >= 0`). No es columna de la BD. */
  mfaVerified: boolean;
};

/** Estado del organizador (`organizers.status`), separado del rol: solo `approved` muta eventos. */
export type OrganizerStatus = "approved" | "pending" | "suspended";
