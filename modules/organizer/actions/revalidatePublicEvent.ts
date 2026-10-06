import "server-only";

import { revalidatePath } from "next/cache";

// Sin "use server": solo lo importan las acciones de eventos del panel.

/**
 * Invalida las páginas públicas que muestran un evento (spec admin-panel, F5b): el inicio, el catálogo, su detalle y su
 * compra. Se llama al publicarlo, al cancelarlo y al editarlo publicado, para que el catálogo no sirva la versión
 * anterior (generada en el build o en una visita previa).
 */
export function revalidatePublicEvent(slug: string): void {
  revalidatePath("/");
  revalidatePath("/eventos");
  revalidatePath(`/eventos/${slug}`);
  revalidatePath(`/eventos/${slug}/entradas`);
}
