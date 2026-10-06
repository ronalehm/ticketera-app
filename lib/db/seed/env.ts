import { z } from "zod";

/**
 * Variables propias del seed y de `db:reset-demo` (spec admin-panel, Decisión 9): no entran en `lib/env.ts`,
 * para que la app desplegada no las exija.
 */

/** Configuración del seed inválida: se lanza antes de conectar o escribir nada. */
export class SeedConfigError extends Error {
  override name = "SeedConfigError";
}

export type SeedRoles = {
  /** El super admin: nunca es organizador ni se degrada. */
  superAdminEmail: string;
  /** Organizadores reales de prueba: en minúsculas, sin repetir y ordenados (el reparto de eventos no depende del orden). */
  organizerEmails: string[];
};

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: (issue) => `Correo inválido: "${String(issue.input)}"` }));

const seedRolesSchema = z
  .object({
    superAdminEmail: emailSchema,
    organizerEmails: z
      .array(emailSchema)
      .min(1, "Hace falta al menos un correo de organizador")
      .transform((emails) => [...new Set(emails)].sort()),
  })
  .refine(({ superAdminEmail, organizerEmails }) => !organizerEmails.includes(superAdminEmail), {
    message:
      "SUPER_ADMIN_EMAIL no puede estar en SEED_ORGANIZER_EMAILS: el seed nunca convierte al super admin en organizador",
    path: ["organizerEmails"],
  });

const seedEnvSchema = z.object({
  SUPER_ADMIN_EMAIL: z.string({ error: "Falta SUPER_ADMIN_EMAIL" }),
  SEED_ORGANIZER_EMAILS: z.string({ error: "Falta SEED_ORGANIZER_EMAILS" }),
});

function fail(error: z.ZodError): never {
  throw new SeedConfigError(`Configuración del seed inválida:\n${z.prettifyError(error)}`);
}

/** Normaliza los correos y comprueba que el super admin no esté entre los organizadores. Lanza `SeedConfigError`. */
export function parseSeedRoles(input: SeedRoles): SeedRoles {
  const result = seedRolesSchema.safeParse(input);
  return result.success ? result.data : fail(result.error);
}

/** Lee `SUPER_ADMIN_EMAIL` y `SEED_ORGANIZER_EMAILS` (lista separada por comas). Lanza `SeedConfigError`. */
export function parseSeedEnv(source: Record<string, string | undefined> = process.env): SeedRoles {
  const result = seedEnvSchema.safeParse(source);
  if (!result.success) fail(result.error);
  return parseSeedRoles({
    superAdminEmail: result.data.SUPER_ADMIN_EMAIL,
    organizerEmails: result.data.SEED_ORGANIZER_EMAILS.split(",").filter((email) => email.trim() !== ""),
  });
}
