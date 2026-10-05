import Link from "next/link";
import { Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Enlace con aspecto de botón primario a Crear evento (encabezado de Resumen y Mis eventos). */
export function CreateEventLink() {
  return (
    <Link
      href="/organizador/eventos/nuevo"
      className={cn(
        buttonVariants(),
        "h-11 w-full cursor-pointer gap-2 px-5 font-semibold duration-200 hover:bg-primary-strong md:w-auto",
      )}
    >
      <Plus className="size-5" aria-hidden />
      Crear evento
    </Link>
  );
}
