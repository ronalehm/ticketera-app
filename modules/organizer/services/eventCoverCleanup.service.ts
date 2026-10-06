import "server-only";

import { del } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { events } from "@/lib/db/schema/events";
import { env } from "@/lib/env";
import { parseCoverPathname } from "../utils/coverPathname";

// Borrado best effort de portadas propias en Vercel Blob (spec event-cover-upload, «Archivos huérfanos»). Se llama
// solo después de guardar o borrar el evento; nunca lanza.

/** Host público de nuestro store: el SDK construye las URLs como `https://<storeId sin "store_">.public.blob...`. */
function ownStoreHost(storeId: string): string {
  return `${storeId.replace(/^store_/, "").toLowerCase()}.public.blob.vercel-storage.com`;
}

/** ¿Es `url` una portada de nuestro store (`https://<store>.public.blob.vercel-storage.com/events/...`)? */
function isOwnCover(url: string, storeId: string): boolean {
  if (!URL.canParse(url)) return false;
  const { protocol, hostname, pathname } = new URL(url);
  return protocol === "https:" && hostname === ownStoreHost(storeId) && parseCoverPathname(pathname.slice(1)) !== null;
}

/**
 * Borra la portada `url` si es de nuestro store bajo `events/` y ningún evento la usa ya en `events.image_url`. Sin
 * `BLOB_STORE_ID` no hace nada; una URL externa nunca se toca. Si algo falla, lo registra y sigue.
 */
export async function deleteOwnCoverBestEffort(url: string | null | undefined): Promise<void> {
  const storeId = env.BLOB_STORE_ID;
  if (!url || !storeId || !isOwnCover(url, storeId)) return;
  try {
    if ((await db.$count(events, eq(events.imageUrl, url))) > 0) return;
    await del(url);
  } catch (error) {
    console.error("deleteOwnCoverBestEffort", { url, error: error instanceof Error ? error.message : String(error) });
  }
}
