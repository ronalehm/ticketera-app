import type { z } from "zod";
import type { authUserSchema, loginSchema, registerSchema } from "../schemas/auth.schema";

export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type DocumentType = RegisterInput["documentType"];

/** Usuario de la sesión de Clerk en el cliente (nombres ausentes → ""). */
export type SessionIdentity = { firstName: string; lastName: string; email: string };
