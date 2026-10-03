import { z } from "zod";

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
