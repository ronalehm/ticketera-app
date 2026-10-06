// Pathname de las portadas en Vercel Blob (spec event-cover-upload, Decisión 7): `events/<scope>/<uuid>.<ext>`, con
// `scope` = id del evento (editar) o `draft` (crear). Sin `server-only`: lo usa también el cliente.

/** Tipos de imagen aceptados y la extensión con la que se guardan. */
export const COVER_MIME_TO_EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

export type CoverMime = keyof typeof COVER_MIME_TO_EXT;

/** Peso máximo de una portada: 5 MB. */
export const COVER_MAX_BYTES = 5 * 1024 * 1024;

/** Tamaño recomendado (16:9) y ancho mínimo por debajo del cual se avisa (no se bloquea). */
export const COVER_RECOMMENDED = { width: 1920, height: 1080, minWidth: 1200 } as const;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const COVER_PATHNAME = new RegExp(`^events/(draft|${UUID})/${UUID}\\.(jpg|png|webp)$`);

const EXT_TO_MIME = Object.fromEntries(
  Object.entries(COVER_MIME_TO_EXT).map(([mime, ext]) => [ext, mime]),
) as Record<string, CoverMime>;

/** Pathname nuevo para subir una portada (`scope`: id del evento o `draft`); nunca usa el nombre original del archivo. */
export function buildCoverPathname(scope: string, mime: CoverMime): string {
  return `events/${scope}/${crypto.randomUUID()}.${COVER_MIME_TO_EXT[mime]}`;
}

/** Evento (`null` si es `draft`) y MIME de un pathname de portada; `null` si no cumple el patrón. */
export function parseCoverPathname(pathname: string): { eventId: string | null; mime: CoverMime } | null {
  const match = COVER_PATHNAME.exec(pathname);
  if (!match) return null;
  const [, scope, ext] = match;
  return { eventId: scope === "draft" ? null : scope, mime: EXT_TO_MIME[ext] };
}
