"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getEventEditHref } from "@/modules/organizer/editLink";

type EventEditLinkProps = {
  eventId: string;
  className?: string;
};

/**
 * «Editar evento» en el detalle público. La página es estática: el enlace se pide tras montar a una server action
 * que comprueba sesión, permiso y dueño, y solo se muestra si devuelve un href (spec event-editing, Decisión 4).
 */
export function EventEditLink({ eventId, className }: EventEditLinkProps) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Si la acción falla, no hay botón: es un atajo, no un flujo crítico.
    getEventEditHref(eventId).then(
      (value) => active && setHref(value),
      () => {},
    );
    return () => {
      active = false;
    };
  }, [eventId]);

  if (!href) return null;

  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant: "outline" }), "h-11 cursor-pointer gap-2 px-4 font-semibold duration-200", className)}
    >
      <Pencil aria-hidden className="size-4" />
      Editar evento
    </Link>
  );
}
