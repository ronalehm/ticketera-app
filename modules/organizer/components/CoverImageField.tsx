"use client";

import { useState } from "react";
import { uploadPresigned } from "@vercel/blob/client";

import { EventCoverImage } from "@/components/shared/EventCoverImage";
import { ImageUpload, ImageUploadError } from "@/components/shared/ImageUpload";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { EVENT_DRAFT_LIMITS } from "../schemas/organizer.schema";
import { buildCoverPathname, COVER_MAX_BYTES, COVER_MIME_TO_EXT, COVER_RECOMMENDED } from "../utils/coverPathname";
import type { CoverMime } from "../utils/coverPathname";
import { FORM_INPUT_CLASS } from "./formStyles";

const UPLOAD_ROUTE = "/api/event-covers";
const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";
const COVER_ACCEPT = Object.keys(COVER_MIME_TO_EXT) as CoverMime[];
/** Solo si la ruta no manda `{ error }` (los textos son los de la spec, Manejo de errores). */
const ROUTE_ERRORS: Record<number, string> = {
  401: "Inicia sesión para subir imágenes",
  403: "No tienes permiso para subir imágenes",
  404: "No puedes cambiar la portada de este evento",
  503: "La subida de imágenes no está configurada en este entorno. Usa la pestaña “Usar URL”.",
};
const CROPS = [
  { label: "Detalle 16:9", className: "w-36 aspect-video" },
  { label: "Hero escritorio 21:8", className: "w-48 aspect-[21/8]" },
  { label: "Hero móvil 4:5", className: "w-20 aspect-[4/5]" },
];
const TAB_TRIGGER_CLASS =
  "h-11 cursor-pointer rounded-lg px-4 text-sm font-semibold text-muted-foreground duration-200 hover:text-foreground data-active:bg-primary data-active:text-primary-foreground data-active:hover:text-primary-foreground";

function isBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

/**
 * `uploadPresigned` (@vercel/blob 2.8) descarta el status y el `{ error }` de la ruta. Si la subida falla, se repite
 * la petición de la URL prefirmada solo para leerlos; si la ruta responde bien, el fallo fue de Blob o de la red.
 */
async function routeError(pathname: string, clientPayload: string): Promise<ImageUploadError | null> {
  try {
    const response = await fetch(UPLOAD_ROUTE, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "blob.generate-presigned-url", payload: { pathname, clientPayload, multipart: false } }),
    });
    if (response.ok) return null;
    const body: unknown = await response.json().catch(() => null);
    const error = body && typeof body === "object" && "error" in body ? body.error : undefined;
    const message = typeof error === "string" ? error : ROUTE_ERRORS[response.status];
    return message ? new ImageUploadError(message) : null;
  } catch {
    return null;
  }
}

/** Sube la portada directamente a Vercel Blob (spec event-cover-upload, Decisión 2). */
async function uploadCover(file: File, eventId: string | null): Promise<{ url: string }> {
  // `ImageUpload` ya comprobó que el tipo está en `COVER_ACCEPT`.
  const pathname = buildCoverPathname(eventId ?? "draft", file.type as CoverMime);
  const clientPayload = JSON.stringify({ eventId });
  try {
    return await uploadPresigned(pathname, file, { access: "public", handleUploadUrl: UPLOAD_ROUTE, clientPayload });
  } catch (error) {
    throw (await routeError(pathname, clientPayload)) ?? error;
  }
}

function CoverCrops({ src }: { src: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        {CROPS.map(({ label, className }) => (
          <figure key={label} className="flex flex-col gap-1">
            <div className={cn("relative overflow-hidden rounded-lg bg-muted ring-1 ring-border", className)}>
              <EventCoverImage src={src} alt="" fill sizes="192px" className="object-cover" />
            </div>
            <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
          </figure>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Deja lo importante en el centro: cada pantalla la recorta de forma distinta.</p>
    </div>
  );
}

type CoverImageFieldProps = {
  /** Id del input de «Usar URL»; de él salen los de su ayuda (`-description`) y su error (`-error`). */
  id: string;
  /** Evento que se edita, o `null` al crear (sube a `events/draft/`). */
  eventId: string | null;
  value: string;
  onChange: (url: string) => void;
  /** Revalidación: al salir del input o al subir/eliminar una imagen. */
  onBlur: () => void;
  error?: string;
  /** `true` mientras se valida o sube un archivo. */
  onUploadingChange: (uploading: boolean) => void;
};

/** Portada del evento: pestañas «Subir imagen» (Vercel Blob) / «Usar URL» (Decisión 9). */
export function CoverImageField({ id, eventId, value, onChange, onBlur, error, onUploadingChange }: CoverImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  function choose(url: string) {
    onChange(url);
    onBlur();
  }

  return (
    <Field data-invalid={!!error}>
      {/* Solo se lee al montar: en editar, una portada que no es de nuestro store se abre en «Usar URL». */}
      <Tabs defaultValue={value && !isBlobUrl(value) ? "url" : "upload"} className="gap-4">
        <TabsList
          aria-label="Origen de la portada"
          className="grid w-full grid-cols-2 gap-1 rounded-xl bg-background p-1 ring-1 ring-border group-data-horizontal/tabs:h-auto sm:w-auto"
        >
          <TabsTrigger value="upload" className={TAB_TRIGGER_CLASS}>
            Subir imagen
          </TabsTrigger>
          {/* Durante la subida no se sale de «Subir imagen»: desmontaría `ImageUpload` con la subida en curso. */}
          <TabsTrigger value="url" disabled={uploading} className={TAB_TRIGGER_CLASS}>
            Usar URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <ImageUpload
            value={value}
            onChange={choose}
            upload={(file) => uploadCover(file, eventId)}
            accept={COVER_ACCEPT}
            maxBytes={COVER_MAX_BYTES}
            recommended={COVER_RECOMMENDED}
            previewAlt="Vista previa de la portada"
            onUploadingChange={(next) => {
              setUploading(next);
              onUploadingChange(next);
            }}
            renderPreviewExtra={(src) => <CoverCrops src={src} />}
          />
        </TabsContent>

        <TabsContent value="url" className="flex flex-col gap-2">
          <FieldLabel htmlFor={id}>URL de la imagen</FieldLabel>
          <Input
            id={id}
            type="url"
            inputMode="url"
            placeholder="https://…"
            maxLength={EVENT_DRAFT_LIMITS.imageUrl}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            aria-invalid={!!error}
            aria-describedby={cn(descriptionId, error && errorId)}
            className={FORM_INPUT_CLASS}
          />
          <FieldDescription id={descriptionId}>
            Enlace https a la imagen (recomendado 1920 × 1080 px, 16:9). Deja lo importante en el centro: cada pantalla la
            recorta de forma distinta.
          </FieldDescription>
        </TabsContent>
      </Tabs>
      <FieldError id={errorId}>{error}</FieldError>
    </Field>
  );
}
