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

/** `Nombre <correo@dominio>`, como `Mentec Tickets <notificaciones@ticketera.mentec.dev>`. */
const emailFrom = z
  .string()
  .regex(/^[^<>]+ <[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>$/, "Formato esperado: Nombre <correo@dominio>");

/** Correos separados por comas, normalizados a minúsculas y sin vacíos. */
const emailList = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
  .pipe(z.array(z.email()));

export type EmailDeliveryMode = "live" | "allowlist";

/**
 * Modo de entrega efectivo (spec event-change-notifications, Decisión 1): `live` solo si se pide `live` en Production
 * de Vercel; en cualquier otro entorno se fuerza `allowlist`.
 */
export function effectiveEmailDeliveryMode(input: {
  EMAIL_DELIVERY_MODE: EmailDeliveryMode;
  VERCEL_ENV?: string;
}): EmailDeliveryMode {
  return input.EMAIL_DELIVERY_MODE === "live" && input.VERCEL_ENV === "production" ? "live" : "allowlist";
}

const serverEnvObject = z.object({
  APP_URL: appUrl,
  DATABASE_URL: z.url(),
  DATABASE_URL_UNPOOLED: optional(z.url()),
  DATABASE_URL_MIGRATOR: optional(z.url()),
  DATABASE_URL_TEST: optional(z.url()),
  CLERK_SECRET_KEY: z.string().startsWith("sk_"),
  // Solo claves de test de Stripe en todos los entornos (las live llegan en F8).
  STRIPE_SECRET_KEY: z.string().startsWith("sk_test_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  // Vercel Blob por OIDC (spec event-cover-upload): opcionales; sin ellas la subida de portadas responde 503.
  // `handleUploadPresigned` (@vercel/blob 2.8.0) lanza "Missing webhook public key" sin BLOB_WEBHOOK_PUBLIC_KEY, aunque
  // no haya `onUploadCompleted`.
  BLOB_STORE_ID: optional(z.string()),
  BLOB_WEBHOOK_PUBLIC_KEY: optional(z.string()),
  // Correo transaccional con Resend (spec event-change-notifications): opcionales; sin RESEND_API_KEY o sin EMAIL_FROM
  // las notificaciones se encolan y el envío se omite. Solo servidor: nunca con prefijo NEXT_PUBLIC_.
  RESEND_API_KEY: optional(z.string().startsWith("re_")),
  EMAIL_FROM: optional(emailFrom),
  EMAIL_DELIVERY_MODE: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["live", "allowlist"]).default("allowlist"),
  ),
  EMAIL_ALLOWED_RECIPIENTS: optional(emailList),
  // Vercel lo envía al cron como `Authorization: Bearer <CRON_SECRET>`.
  CRON_SECRET: optional(z.string().min(16)),
  // Lo define Vercel (`production`, `preview`, `development`); fuera de Vercel no existe.
  VERCEL_ENV: optional(z.string()),
});

export const serverEnvSchema = serverEnvObject.superRefine((value, ctx) => {
  if (
    value.RESEND_API_KEY &&
    effectiveEmailDeliveryMode(value) === "allowlist" &&
    !value.EMAIL_ALLOWED_RECIPIENTS?.length
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["EMAIL_ALLOWED_RECIPIENTS"],
      message: "Obligatoria con RESEND_API_KEY en modo allowlist (todo entorno fuera de Production)",
    });
  }
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
