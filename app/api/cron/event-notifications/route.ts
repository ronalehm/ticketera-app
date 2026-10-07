import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { processDueEventNotifications } from "@/modules/notifications/server";

// Cron de Vercel (`vercel.json` → `crons`) que procesa el outbox de correos a compradores (spec
// event-change-notifications, Decisión 7): vencidas, reintentables y con reclamo vencido. Vercel envía
// `Authorization: Bearer <CRON_SECRET>`; sin `CRON_SECRET` configurado no se ejecuta.

const LOT_SIZE = 50;
/** Tope de lotes por ejecución: lo que quede lo recoge la siguiente (o el drenado de `after()`). */
const MAX_LOTS = 10;

/** Compara por hash (longitud fija) en tiempo constante. */
const digest = (value: string) => createHash("sha256").update(value).digest();
const isAuthorized = (header: string | null) =>
  !!env.CRON_SECRET && !!header && timingSafeEqual(digest(header), digest(`Bearer ${env.CRON_SECRET}`));

export async function GET(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  let processed = 0;
  for (let lot = 0; lot < MAX_LOTS; lot++) {
    const count = await processDueEventNotifications({ limit: LOT_SIZE });
    processed += count;
    if (count < LOT_SIZE) break;
  }
  console.info("event-notifications cron completed", { processed });
  return Response.json({ processed });
}
