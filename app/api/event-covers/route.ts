import { handleUploadPresigned } from "@vercel/blob/client";
import { z } from "zod";
import { env } from "@/lib/env";
import { getSessionUser } from "@/modules/auth/server";
import { COVER_UPLOAD_ERRORS, CoverUploadError, getCoverSignedToken } from "@/modules/organizer/server";

// Presigned URL para subir una portada directamente del navegador a Vercel Blob (spec event-cover-upload). Solo se
// acepta la emisión de la URL: sin `onUploadCompleted`, el callback de Blob no tiene nada que hacer aquí.
// `BLOB_WEBHOOK_PUBLIC_KEY` es obligatoria igualmente: `handleUploadPresigned` (@vercel/blob 2.8.0) lanza
// `BlobError("Missing webhook public key")` antes de mirar el tipo de evento si no la recibe ni está en el entorno.
const bodySchema = z.object({
  type: z.literal("blob.generate-presigned-url"),
  payload: z.object({ pathname: z.string(), clientPayload: z.string().nullable(), multipart: z.boolean() }),
});

export async function POST(request: Request) {
  if (!env.BLOB_STORE_ID || !env.BLOB_WEBHOOK_PUBLIC_KEY) {
    return Response.json({ error: COVER_UPLOAD_ERRORS.notConfigured }, { status: 503 });
  }
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: COVER_UPLOAD_ERRORS.invalid }, { status: 400 });

  try {
    const user = await getSessionUser();
    const result = await handleUploadPresigned({
      body: body.data,
      request,
      webhookPublicKey: env.BLOB_WEBHOOK_PUBLIC_KEY,
      getSignedToken: (pathname, clientPayload) => getCoverSignedToken(user, pathname, clientPayload),
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof CoverUploadError) return Response.json({ error: error.message }, { status: error.status });
    console.error("[event-covers] No se pudo emitir la URL prefirmada", error);
    return Response.json({ error: COVER_UPLOAD_ERRORS.invalid }, { status: 500 });
  }
}
