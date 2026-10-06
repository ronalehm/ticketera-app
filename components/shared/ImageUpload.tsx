"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DragEvent, ReactNode } from "react";
import { ImageUp, TriangleAlert } from "lucide-react";

import { EventCoverImage } from "@/components/shared/EventCoverImage";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * Error de `upload` cuyo `message` se muestra tal cual al usuario (p. ej. «No tienes permiso para subir imágenes»).
 * Cualquier otro error muestra el mensaje genérico de fallo.
 */
export class ImageUploadError extends Error {}

export type ImageUploadProps = {
  /** URL actual de la imagen, o "" si no hay. */
  value: string;
  /** Recibe la URL subida, o "" al pulsar «Eliminar». Nunca se llama si la subida falla. */
  onChange: (url: string) => void;
  /** Sube el archivo ya validado y devuelve su URL pública. Para un mensaje propio, lanza `ImageUploadError`. */
  upload: (file: File) => Promise<{ url: string }>;
  /** Tipos MIME permitidos (p. ej. `["image/jpeg", "image/png", "image/webp"]`). */
  accept: readonly string[];
  /** Peso máximo en bytes (1 MB = 1024 × 1024). */
  maxBytes: number;
  /** Medidas recomendadas; un ancho menor que `minWidth` muestra una advertencia sin bloquear la subida. */
  recommended: { width: number; height: number; minWidth: number };
  /** Texto alternativo de la vista previa. */
  previewAlt?: string;
  disabled?: boolean;
  /** `true` mientras se valida o sube un archivo (para deshabilitar el envío del formulario). */
  onUploadingChange?: (uploading: boolean) => void;
  /** Id del botón principal («Seleccionar archivo» o «Cambiar imagen»), para enlazar un `<label>`. */
  id?: string;
  "aria-describedby"?: string;
  /** Contenido extra bajo la vista previa (p. ej. recortes); recibe la URL mostrada (local durante la subida). */
  renderPreviewExtra?: (src: string) => ReactNode;
  className?: string;
};

type Status = "idle" | "validating" | "uploading";
type Meta = { url: string; width: number; height: number; size: number };

const MB = 1024 * 1024;
const TYPE_LABELS: Record<string, string> = { "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WebP" };
const UPLOAD_FAILED = "No se pudo subir la imagen. Inténtalo de nuevo";

const typeLabel = (mime: string) => TYPE_LABELS[mime] ?? mime.split("/").pop()!.toUpperCase();
const formatTypes = (accept: readonly string[]) =>
  new Intl.ListFormat("es", { type: "disjunction" }).format(accept.map(typeLabel));

/** Peso en formato es-PE: 1.8 MB, 512 kB. */
function formatBytes(bytes: number): string {
  const [value, unit] = bytes >= MB ? [bytes / MB, "megabyte"] : [bytes / 1024, "kilobyte"];
  return new Intl.NumberFormat("es-PE", { style: "unit", unit, maximumFractionDigits: 1 }).format(value);
}

function aspectLabel(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const d = gcd(width, height);
  return `${width / d}:${height / d}`;
}

/** Lee las medidas reales del archivo (en tests se sustituye `createImageBitmap`). */
async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  bitmap.close();
  return { width, height };
}

/** Subida de una imagen con arrastrar y soltar o selector, validación en cliente y vista previa. */
export function ImageUpload({
  value,
  onChange,
  upload,
  accept,
  maxBytes,
  recommended,
  previewAlt = "Vista previa de la imagen",
  disabled = false,
  onUploadingChange,
  id,
  "aria-describedby": describedBy,
  renderPreviewExtra,
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const requirementsId = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const busy = status !== "idle";
  const inactive = disabled || busy;
  const previewSrc = pendingSrc ?? value;

  // Libera la vista previa local al reemplazarla o al desmontar.
  useEffect(() => () => {
    if (pendingSrc) URL.revokeObjectURL(pendingSrc);
  }, [pendingSrc]);

  function setBusy(next: Status) {
    busyRef.current = next !== "idle";
    setStatus(next);
    onUploadingChange?.(busyRef.current);
  }

  async function handleFile(file: File | undefined) {
    if (!file || disabled || busyRef.current) return; // sin doble envío
    setError(null);
    setWarning(null);
    if (!accept.includes(file.type)) return setError(`Solo ${formatTypes(accept)}`);
    if (file.size > maxBytes) return setError(`La imagen pesa más de ${formatBytes(maxBytes)}`);

    setBusy("validating");
    let size: { width: number; height: number };
    try {
      size = await readImageSize(file);
    } catch {
      setBusy("idle");
      return setError("No se pudo leer la imagen. Prueba con otro archivo");
    }
    if (size.width < recommended.minWidth) {
      setWarning(
        `La imagen mide ${size.width} px de ancho; se recomienda al menos ${recommended.minWidth} px para que no se vea borrosa`,
      );
    }

    setPendingSrc(URL.createObjectURL(file));
    setBusy("uploading");
    try {
      const { url } = await upload(file);
      setMeta({ url, ...size, size: file.size });
      onChange(url);
    } catch (e) {
      setWarning(null);
      setError(e instanceof ImageUploadError ? e.message : UPLOAD_FAILED);
    } finally {
      setPendingSrc(null);
      setBusy("idle");
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    void handleFile(e.dataTransfer.files[0]);
  }

  function handleRemove() {
    setMeta(null);
    setWarning(null);
    setError(null);
    onChange("");
  }

  const ariaDescribedBy = cn(!previewSrc && requirementsId, describedBy) || undefined;
  const pickButton = (label: string) => (
    <Button
      id={id}
      type="button"
      variant="outline"
      className="h-11 px-4"
      disabled={inactive}
      aria-describedby={ariaDescribedBy}
      onClick={() => inputRef.current?.click()}
    >
      {label}
    </Button>
  );

  return (
    <div
      className={cn("flex flex-col gap-3", className)}
      onDragOver={(e) => {
        e.preventDefault();
        if (!inactive) setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
      }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept.join(",")}
        disabled={inactive}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = ""; // permite volver a elegir el mismo archivo
        }}
      />

      {previewSrc ? (
        <>
          <div
            className={cn(
              "relative aspect-video overflow-hidden rounded-2xl bg-muted ring-1 ring-border",
              dragOver && "ring-2 ring-primary",
            )}
          >
            <EventCoverImage src={previewSrc} alt={previewAlt} fill sizes="(min-width: 768px) 640px, 100vw" className="object-cover" />
            {busy || dragOver ? (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/80 text-sm font-medium text-foreground">
                {busy ? <Spinner aria-hidden className="size-5 motion-reduce:animate-none" /> : null}
                {busy ? (status === "uploading" ? "Subiendo…" : "Comprobando la imagen…") : "Suelta la imagen"}
              </div>
            ) : null}
          </div>
          {meta && meta.url === value && !pendingSrc ? (
            <p className="text-sm text-muted-foreground tabular-nums">
              {meta.width} × {meta.height} px · {formatBytes(meta.size)}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {pickButton("Cambiar imagen")}
            <Button
              type="button"
              variant="destructive"
              className="h-11 px-4"
              disabled={inactive || !value}
              onClick={handleRemove}
            >
              Eliminar
            </Button>
          </div>
          {renderPreviewExtra?.(previewSrc)}
        </>
      ) : (
        <div
          className={cn(
            "flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted px-4 py-8 text-center transition-colors",
            dragOver && "border-primary bg-accent",
            disabled && "opacity-50",
          )}
        >
          <ImageUp aria-hidden className="size-8 text-muted-foreground" />
          <p className="font-medium text-foreground">
            {dragOver ? "Suelta la imagen" : status === "validating" ? "Comprobando la imagen…" : "Arrastra una imagen aquí"}
          </p>
          <p className="text-sm text-muted-foreground">o</p>
          {pickButton("Seleccionar archivo")}
          <div id={requirementsId} className="text-sm text-muted-foreground">
            <p>
              {formatTypes(accept)} · Máx. {formatBytes(maxBytes)}
            </p>
            <p>
              Tamaño recomendado: {recommended.width} × {recommended.height} px (
              {aspectLabel(recommended.width, recommended.height)})
            </p>
          </div>
        </div>
      )}

      <span role="status" className="sr-only">
        {status === "validating" ? "Comprobando la imagen…" : status === "uploading" ? "Subiendo…" : null}
      </span>
      {warning ? (
        <p className="flex items-start gap-2 text-sm text-foreground">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          {warning}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
