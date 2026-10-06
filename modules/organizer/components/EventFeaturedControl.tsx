"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { useSetEventFeatured } from "../hooks/useSetEventFeatured";
import { EVENT_DRAFT_GENERIC_ERROR } from "../utils/eventDraftError";
import { FeaturedToggle } from "./FeaturedToggle";

type EventFeaturedControlProps = {
  /** Id del usuario de la sesión (admin): separa la caché de sus listados. */
  userId: string;
  eventId: string;
  /** Estado al cargar la página (`getEventForEdit`). */
  featured: boolean;
};

type Feedback = { message: string; error: boolean };

/**
 * Destacar / Quitar destacado en la cabecera de Editar (admin, en cualquier estado; spec events-dynamic-landing,
 * Decisión 11). El resultado se anuncia en una región viva junto al botón (no hay toasts).
 */
export function EventFeaturedControl({ userId, eventId, featured: initialFeatured }: EventFeaturedControlProps) {
  const [featured, setFeatured] = useState(initialFeatured);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const mutation = useSetEventFeatured(userId);

  function toggle() {
    setFeedback(null);
    mutation.mutate(
      { id: eventId, featured: !featured },
      {
        onSuccess: (result) => {
          if (!result.ok) return setFeedback({ message: result.error, error: true });
          setFeatured(result.featured);
          setFeedback({
            message: result.featured ? "Evento destacado." : "Evento retirado de destacados.",
            error: false,
          });
        },
        onError: () => setFeedback({ message: EVENT_DRAFT_GENERIC_ERROR, error: true }),
      },
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <FeaturedToggle featured={featured} disabled={mutation.isPending} onClick={toggle} />
      <p
        aria-live="polite"
        aria-atomic="true"
        className={cn("text-sm empty:hidden", feedback?.error ? "text-destructive" : "text-muted-foreground")}
      >
        {feedback?.message}
      </p>
    </div>
  );
}
