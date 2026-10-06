import "server-only";

import { Resend } from "resend";
import { effectiveEmailDeliveryMode, env } from "@/lib/env";

// Spec event-change-notifications, Decisiones 1 y 8. La clave solo vive aquí (módulo de servidor): nunca se registra
// ni se incluye en errores.

/** Cliente y remitente; `null` sin RESEND_API_KEY o sin EMAIL_FROM: el envío se omite y las notificaciones quedan `pending`. */
export const emailSender =
  env.RESEND_API_KEY && env.EMAIL_FROM ? { resend: new Resend(env.RESEND_API_KEY), from: env.EMAIL_FROM } : null;

/** `live` solo en Production de Vercel con `EMAIL_DELIVERY_MODE=live`; en cualquier otro caso, `allowlist`. */
export const emailDeliveryMode = effectiveEmailDeliveryMode(env);

const allowedRecipients = new Set(env.EMAIL_ALLOWED_RECIPIENTS);

/** En `allowlist`, solo los correos de EMAIL_ALLOWED_RECIPIENTS (sin distinguir mayúsculas); en `live`, todos. */
export function isAllowedRecipient(email: string): boolean {
  return emailDeliveryMode === "live" || allowedRecipients.has(email.trim().toLowerCase());
}
