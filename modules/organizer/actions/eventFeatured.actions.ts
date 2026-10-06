"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/modules/auth/server";
import { setEventFeatured } from "../services/eventFeatured.service";
import type { EventDraftActionResult } from "../types/organizer.types";
import { invalidInput, toEventActionFailure } from "./eventActionFailure";
import { revalidatePublicEvent } from "./revalidatePublicEvent";

// Destacar eventos (spec events-dynamic-landing, Decisión 10): solo `events:manageAny` (`requirePermission` redirige sin
// él). Mismo resultado discriminado que las acciones de borradores y moderación.

const featuredInputSchema = z.object({ id: z.uuid("Evento no válido"), featured: z.boolean() });

/** Marca o quita un evento de destacados; invalida la landing y, si está publicado, sus páginas públicas. */
export async function setEventFeaturedAction(
  id: unknown,
  featured: unknown,
): Promise<EventDraftActionResult<{ featured: boolean }>> {
  const actor = await requirePermission("events:manageAny");
  const parsed = featuredInputSchema.safeParse({ id, featured });
  if (!parsed.success) return invalidInput(parsed.error);
  try {
    const { slug, status } = await setEventFeatured(actor, parsed.data.id, parsed.data.featured);
    if (status === "published") revalidatePublicEvent(slug);
    else revalidatePath("/");
    return { ok: true, featured: parsed.data.featured };
  } catch (error) {
    return toEventActionFailure("setEventFeaturedAction", error);
  }
}
