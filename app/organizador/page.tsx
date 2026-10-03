import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OrganizerDashboard, getOrganizerEvents, savedStatusSchema } from "@/modules/organizer";

export const metadata: Metadata = {
  title: "Panel de organizador | Mentec Tickets",
};

export default async function OrganizerPage({ searchParams }: PageProps<"/organizador">) {
  const { guardado } = await searchParams;
  // Cualquier valor distinto de "publicado" | "borrador" (o repetido) da undefined: sin aviso.
  const saved = savedStatusSchema.parse(guardado);
  const events = await getOrganizerEvents();

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Resumen</h1>
          <p className="text-base leading-relaxed text-muted-foreground">Así van las ventas de tus eventos.</p>
        </div>
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
      </header>
      <OrganizerDashboard initialEvents={events} saved={saved} />
    </div>
  );
}
