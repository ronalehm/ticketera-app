import "server-only";

import { issueSignedToken } from "@vercel/blob";
import { z } from "zod";
import { can, roleCan } from "@/modules/auth/permissions";
import { getOrganizerStatus, type SessionUser } from "@/modules/auth/server";
import { COVER_MAX_BYTES, type CoverMime, parseCoverPathname } from "../utils/coverPathname";
import { getEventForEdit } from "./eventDrafts.service";

// Autorización y token prefirmado de la subida de portadas a Vercel Blob (spec event-cover-upload, Decisiones 7 y 8).
// El archivo va del navegador a Blob; aquí solo se decide si se firma y con qué límites.

/** Validez del token prefirmado. */
const COVER_TOKEN_TTL_MS = 10 * 60 * 1000;

export const COVER_UPLOAD_ERRORS = {
  unauthenticated: "Inicia sesión para subir imágenes",
  forbidden: "No tienes permiso para subir imágenes",
  event: "No puedes cambiar la portada de este evento",
  invalid: "No se pudo subir la imagen",
  notConfigured: "La subida de imágenes no está configurada en este entorno. Usa la pestaña “Usar URL”.",
} as const;

/** Rechazo de la subida: la ruta responde `{ error: message }` con `status`. */
export class CoverUploadError extends Error {
  override name = "CoverUploadError";

  constructor(
    readonly status: 400 | 401 | 403 | 503,
    message: string,
  ) {
    super(message);
  }
}

/** Lo que se necesita del usuario de la sesión. */
type CoverUploader = Pick<SessionUser, "id" | "role" | "mfaVerified">;

const clientPayloadSchema = z.object({ eventId: z.uuid().nullable() });

function parseClientPayload(clientPayload: string | null): { eventId: string | null } | null {
  try {
    const result = clientPayloadSchema.safeParse(JSON.parse(clientPayload ?? ""));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** Estados en los que se puede cambiar la portada (los mismos que Editar guarda). */
const COVER_EDITABLE_STATUSES = new Set(["draft", "published"]);

/**
 * ¿Puede `user` subir una portada a `pathname`? Devuelve el MIME que corresponde a su extensión o lanza
 * `CoverUploadError`: sin sesión 401; sin `events:manageOwn` o con un organizador no aprobado 403; pathname o
 * `clientPayload` inválidos o incoherentes 400; evento ajeno, inexistente o no editable 403 (no se distingue si existe).
 */
export async function authorizeCoverUpload(
  user: CoverUploader | null,
  pathname: string,
  clientPayload: string | null,
): Promise<CoverMime> {
  if (!user) throw new CoverUploadError(401, COVER_UPLOAD_ERRORS.unauthenticated);
  if (!can(user, "events:manageOwn")) throw new CoverUploadError(403, COVER_UPLOAD_ERRORS.forbidden);
  // Como `assertActorCanMutate`: solo un organizador `approved` muta eventos; admin y super_admin, siempre.
  if (!roleCan(user.role, "events:manageAny") && (await getOrganizerStatus(user.id)) !== "approved") {
    throw new CoverUploadError(403, COVER_UPLOAD_ERRORS.forbidden);
  }

  const cover = parseCoverPathname(pathname);
  const payload = parseClientPayload(clientPayload);
  if (!cover || !payload || payload.eventId !== cover.eventId) {
    throw new CoverUploadError(400, COVER_UPLOAD_ERRORS.invalid);
  }

  if (cover.eventId) {
    // Mismo alcance que Editar: el suyo o, con `events:manageAny`, cualquiera.
    const event = await getEventForEdit(user, cover.eventId);
    if (!event || !COVER_EDITABLE_STATUSES.has(event.status)) throw new CoverUploadError(403, COVER_UPLOAD_ERRORS.event);
  }
  return cover.mime;
}

/**
 * Token prefirmado (OIDC: `BLOB_STORE_ID` + `VERCEL_OIDC_TOKEN`) para `getSignedToken` de `handleUploadPresigned`:
 * solo `put`, solo ese pathname, solo el MIME de su extensión, hasta 5 MB y 10 minutos; sin sufijo aleatorio ni
 * sobrescritura.
 */
export async function getCoverSignedToken(user: CoverUploader | null, pathname: string, clientPayload: string | null) {
  const mime = await authorizeCoverUpload(user, pathname, clientPayload);
  const token = await issueSignedToken({
    pathname,
    operations: ["put"],
    allowedContentTypes: [mime],
    maximumSizeInBytes: COVER_MAX_BYTES,
    validUntil: Date.now() + COVER_TOKEN_TTL_MS,
  });
  return { token, urlOptions: { addRandomSuffix: false, allowOverwrite: false } };
}
