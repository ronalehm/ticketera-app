"use client";

import { useId, useState } from "react";
import { CircleAlert } from "lucide-react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useZodForm } from "@/hooks/useZodForm";
import { cn } from "@/lib/utils";
import type { ManagedEvent } from "@/modules/events";

import { useModerateEvent } from "../hooks/useEventModeration";
import { REVIEW_NOTE_MAX_LENGTH, rejectEventFormSchema } from "../schemas/organizer.schema";
import { EVENT_DRAFT_GENERIC_ERROR } from "../utils/eventDraftError";

const BUTTON_CLASS = "h-11 cursor-pointer px-4 font-semibold";

type RejectEventDialogProps = {
  userId: string;
  /** Evento en revisión que se rechaza; se conserva al cerrar para la animación de salida. */
  event: Pick<ManagedEvent, "id" | "title"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rechazado; `title` es el nombre del evento. */
  onRejected: (title: string) => void;
};

/** "Rechazar": el evento vuelve a borrador con un motivo obligatorio, que el organizador ve al editarlo. */
export function RejectEventDialog({ userId, event, open, onOpenChange, onRejected }: RejectEventDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-5 p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">¿Rechazar «{event?.title}»?</DialogTitle>
          <DialogDescription className="text-base">
            Vuelve a borrador. El organizador verá el motivo al editarlo y podrá enviarlo a revisión otra vez.
          </DialogDescription>
        </DialogHeader>
        {/* Dentro del popup: se desmonta al cerrar y el formulario empieza vacío cada vez. */}
        {event && <RejectEventForm userId={userId} event={event} onRejected={onRejected} />}
      </DialogContent>
    </Dialog>
  );
}

function RejectEventForm({
  userId,
  event,
  onRejected,
}: Pick<RejectEventDialogProps, "userId" | "onRejected"> & { event: Pick<ManagedEvent, "id" | "title"> }) {
  const id = useId();
  const moderate = useModerateEvent(userId);
  const [serverError, setServerError] = useState<string | null>(null);
  const { values, errors, isSubmitting, setValue, handleBlur, handleSubmit } = useZodForm(rejectEventFormSchema, {
    note: "",
  });
  const noteId = `${id}-note`;
  const describedBy = [`${noteId}-description`, errors.note && `${noteId}-error`].filter(Boolean).join(" ");

  const onSubmit = handleSubmit(async ({ note }) => {
    setServerError(null);
    try {
      const result = await moderate.mutateAsync({ transition: "reject", eventId: event.id, note });
      if (result.ok) onRejected(event.title);
      else setServerError(result.error);
    } catch {
      setServerError(EVENT_DRAFT_GENERIC_ERROR);
    }
  });

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
      {serverError && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{serverError}</AlertTitle>
        </Alert>
      )}
      <Field data-invalid={!!errors.note}>
        <FieldLabel htmlFor={noteId}>Motivo del rechazo</FieldLabel>
        <Textarea
          id={noteId}
          rows={4}
          maxLength={REVIEW_NOTE_MAX_LENGTH}
          value={values.note}
          onChange={(changeEvent) => setValue("note", changeEvent.target.value)}
          onBlur={() => handleBlur("note")}
          aria-invalid={!!errors.note}
          aria-describedby={describedBy}
          placeholder="Ej. La portada no corresponde al evento y falta la hora de apertura."
        />
        <FieldDescription id={`${noteId}-description`}>Qué debe corregir el organizador.</FieldDescription>
        <FieldError id={`${noteId}-error`}>{errors.note}</FieldError>
      </Field>
      <DialogFooter className="-mx-5 -mb-5 p-5">
        <DialogClose disabled={isSubmitting} render={<Button variant="outline" className={BUTTON_CLASS} />}>
          Cancelar
        </DialogClose>
        <Button type="submit" disabled={isSubmitting} className={cn(BUTTON_CLASS, "duration-200 hover:bg-primary-strong")}>
          {isSubmitting && <Spinner aria-hidden className="motion-reduce:animate-none" />}
          {isSubmitting ? "Rechazando…" : "Rechazar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
