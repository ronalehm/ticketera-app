"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import Image from "next/image";
import { ImagePlus, ImageUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils";

import { COVER_IMAGE_RULES } from "../schemas/organizer.schema";
import { ACCEPTED_COVER_IMAGE_TYPES, MAX_COVER_MEGABYTES } from "../utils/organizerEventForm";
import { CoverCropPreview } from "./CoverCropPreview";
import { FORM_CONTROL_SCROLL } from "./TicketTypesField";

const ACCEPTED_TYPES = ACCEPTED_COVER_IMAGE_TYPES.join(",");
const COVER_IMAGE_HINT = `JPG o PNG, hasta ${MAX_COVER_MEGABYTES} MB. Recomendado: 1920 × 1080 px (16:9); mínimo ${COVER_IMAGE_RULES.minWidth} × ${COVER_IMAGE_RULES.minHeight} px.`;

type CoverImageFieldProps = {
  /** URL local (`blob:`) de la imagen elegida; `null` muestra la zona de subida. */
  previewUrl: string | null;
  /** Error del archivo elegido o, sin él, el de portada obligatoria al publicar. */
  error?: string;
  /** Recibe el archivo elegido o soltado; el formulario lo valida (tipo, peso y tamaño). */
  onSelect: (file: File) => void;
  onRemove: () => void;
};

export function CoverImageField({ previewUrl, error, onSelect, onRemove }: CoverImageFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  const previousUrlRef = useRef(previewUrl);
  const [isDragging, setIsDragging] = useState(false);

  // Al cargar una imagen el foco pasa a "Cambiar imagen"; al quitarla, vuelve a la zona de subida.
  useEffect(() => {
    if (previousUrlRef.current === previewUrl) return;
    previousUrlRef.current = previewUrl;
    if (previewUrl) changeButtonRef.current?.focus();
    else inputRef.current?.focus();
  }, [previewUrl]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Se vacía para que volver a elegir el mismo archivo dispare `change`.
    event.target.value = "";
    if (file) onSelect(file);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onSelect(file);
  }

  const errorDescription = error ? errorId : undefined;
  const inputProps = {
    ref: inputRef,
    type: "file",
    accept: ACCEPTED_TYPES,
    onChange: handleChange,
  } as const;

  return (
    <div className="flex flex-col gap-2" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {previewUrl ? (
        <div className="flex flex-col gap-3">
          <div
            className={cn(
              "relative aspect-video overflow-hidden rounded-2xl bg-muted ring-1 ring-border transition-shadow duration-200",
              isDragging && "ring-2 ring-primary",
            )}
          >
            <Image
              src={previewUrl}
              alt="Vista previa de la imagen de portada"
              fill
              unoptimized
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              ref={changeButtonRef}
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              aria-describedby={errorDescription}
              className={cn("h-11 cursor-pointer font-semibold text-primary-strong duration-200", FORM_CONTROL_SCROLL)}
            >
              <ImageUp aria-hidden className="size-5" />
              Cambiar imagen
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onRemove}
              className={cn("h-11 cursor-pointer font-semibold duration-200 hover:text-destructive", FORM_CONTROL_SCROLL)}
            >
              <Trash2 aria-hidden className="size-5" />
              Quitar imagen
            </Button>
          </div>
          {/* Lo abre "Cambiar imagen"; fuera del orden de tabulación y del árbol de accesibilidad. Sin `aria-invalid`:
              no se puede enfocar y el error de archivo con imagen previa no bloquea el envío, así que no debe atraer
              el foco al publicar ("Cambiar imagen" ya enlaza el error). */}
          <input {...inputProps} hidden />
        </div>
      ) : (
        <label
          className={cn(
            "relative flex h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-accent px-4 text-center transition-colors duration-200 hover:border-primary has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-ring has-[input:focus-visible]:ring-offset-2 lg:h-44",
            isDragging && "border-primary",
          )}
        >
          <input
            {...inputProps}
            aria-invalid={!!error}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            className={cn("sr-only", FORM_CONTROL_SCROLL)}
          />
          <ImagePlus aria-hidden className="size-8 text-primary-strong" />
          <span className="text-sm font-semibold text-primary-strong">
            <span className="hidden lg:inline">Arrastra una imagen o haz clic para subirla</span>
            <span className="lg:hidden">Subir imagen</span>
          </span>
          <span id={hintId} className="text-sm text-muted-foreground">
            {COVER_IMAGE_HINT}
          </span>
        </label>
      )}
      <p className="text-sm text-muted-foreground">
        Es la imagen principal de la página de tu evento. Deja lo importante (rostros, texto, logo) en el centro: cada
        pantalla la recorta de forma distinta.
      </p>
      <FieldError id={errorId}>{error}</FieldError>
      {previewUrl && <CoverCropPreview src={previewUrl} className="mt-2" />}
    </div>
  );
}
