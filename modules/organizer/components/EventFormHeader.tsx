import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Encabezado de Crear y Editar borrador: "Volver a Mis eventos" pegado sobre el h1 (único de la página). */
export function EventFormHeader({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Link
        href="/organizador/eventos"
        className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg text-sm font-medium text-muted-foreground transition-colors duration-200 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver a Mis eventos
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
    </div>
  );
}
