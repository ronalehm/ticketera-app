import { z } from "zod";

/** Ruta interna de la app (`/login`). */
const appPath = z.string().startsWith("/");

/** Variable opcional: un valor vacío (`VAR=`) cuenta como ausente. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

/**
 * URL pública de la app (`http(s)`, sin barra final: se normaliza). Base de las URLs absolutas que salen del servidor,
 * como el `redirectUrl` de las invitaciones de Clerk (`${APP_URL}/registro`).
 */
const appUrl = z
  .url({ protocol: /^https?$/ })
  .refine((value) => !/[?#]/.test(value), "Sin query ni fragmento: se le concatenan rutas")
  .transform((value) => value.replace(/\/+$/, ""));

export const serverEnvSchema = z.object({
  APP_URL: appUrl,
  DATABASE_URL: z.url(),
  DATABASE_URL_UNPOOLED: optional(z.url()),
  DATABASE_URL_MIGRATOR: optional(z.url()),
  DATABASE_URL_TEST: optional(z.url()),
  CLERK_SECRET_KEY: z.string().startsWith("sk_"),
  // Solo claves de test de Stripe en todos los entornos (las live llegan en F8).
  STRIPE_SECRET_KEY: z.string().startsWith("sk_test_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function parseEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Variables de entorno inválidas:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const env = parseEnv();

export const publicEnvSchema = z.object({
  // Cadena vacía o solo espacios se trata como ausente.
  NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY: z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: appPath,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: appPath,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_test_"),
});

// Acceso literal a process.env.NEXT_PUBLIC_* para que Next lo incruste en el build.
export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY:
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
});
