import { z } from "zod";

/** Variable opcional: un valor vacío (`VAR=`) cuenta como ausente. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional());

export const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  DATABASE_URL_UNPOOLED: optional(z.url()),
  DATABASE_URL_MIGRATOR: optional(z.url()),
  DATABASE_URL_TEST: optional(z.url()),
  SUPER_ADMIN_EMAIL: optional(z.email().transform((email) => email.toLowerCase())),
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
});

// Acceso literal a process.env.NEXT_PUBLIC_* para que Next lo incruste en el build.
export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY:
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY,
});
