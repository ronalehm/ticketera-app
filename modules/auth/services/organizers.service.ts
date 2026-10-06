import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { organizers } from "@/lib/db/schema/identity";
import type { OrganizerStatus } from "../types/auth.types";

/** El usuario no es un organizador `approved` (está `pending`, `suspended` o no tiene fila en `organizers`). */
export class OrganizerNotApprovedError extends Error {
  override name = "OrganizerNotApprovedError";

  constructor(readonly status: OrganizerStatus | null) {
    super(status ? `El organizador no está aprobado (${status})` : "El usuario no es organizador");
  }
}

type Queryable = Pick<typeof db, "select">;

/** Estado de `organizers` del usuario; `null` si no tiene fila de organizador. */
export async function getOrganizerStatus(userId: string, database: Queryable = db): Promise<OrganizerStatus | null> {
  const [row] = await database
    .select({ status: organizers.status })
    .from(organizers)
    .where(eq(organizers.userId, userId));
  return row?.status ?? null;
}

/** Exigido en toda mutación de eventos hecha por un organizador: lanza `OrganizerNotApprovedError` si no es `approved`. */
export async function requireApprovedOrganizer(userId: string, database: Queryable = db): Promise<void> {
  const status = await getOrganizerStatus(userId, database);
  if (status !== "approved") throw new OrganizerNotApprovedError(status);
}
