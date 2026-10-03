"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { downloadTicketsPdf } from "@/lib/ticketPdf";
import type { TicketPdfInput } from "@/lib/ticketPdf";
import { cn } from "@/lib/utils";

type TicketsPdfButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "children" | "disabled" | "type"> & {
  input: TicketPdfInput;
  /** Clases del mensaje de error (p. ej. para ocupar todo el ancho en la grilla del padre). */
  errorClassName?: string;
};

type Status = "idle" | "generating" | "error";

/** Genera y descarga el PDF con las entradas de `input`; muestra el progreso y un error recuperable. */
export function TicketsPdfButton({ input, errorClassName, className, ...props }: TicketsPdfButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const isGenerating = status === "generating";

  async function handleClick() {
    if (isGenerating) return;
    setStatus("generating");
    try {
      await downloadTicketsPdf(input);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <Button
        {...props}
        type="button"
        onClick={handleClick}
        disabled={isGenerating}
        focusableWhenDisabled
        aria-busy={isGenerating || undefined}
        className={cn("aria-busy:cursor-progress aria-busy:opacity-70", className)}
      >
        {isGenerating ? (
          <>
            <Spinner aria-hidden className="size-5 motion-reduce:animate-none" />
            Generando…
          </>
        ) : (
          <>
            <Download aria-hidden />
            Descargar PDF
          </>
        )}
      </Button>
      <span role="status" className="sr-only">
        {isGenerating ? "Generando PDF…" : null}
      </span>
      {status === "error" ? (
        <p role="alert" className={cn("text-sm text-destructive", errorClassName)}>
          No pudimos generar el PDF. Inténtalo de nuevo.
        </p>
      ) : null}
    </>
  );
}
