import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { OrganizerEventForm } from "@/modules/organizer";
import { getPanelContext } from "@/modules/panel/server";

export const metadata: Metadata = {
  title: "Crear evento | Mentec Tickets",
};

export default async function CreateOrganizerEventPage() {
  const { readOnly } = await getPanelContext("events:manageOwn", { returnTo: "/organizador/eventos/nuevo" });
  // Un organizador pendiente o suspendido no crea eventos.
  if (readOnly) redirect("/organizador");

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <div className="flex flex-col gap-2">
        <Link
          href="/organizador"
          className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg text-sm font-medium text-muted-foreground transition-colors duration-200 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Volver al resumen
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Crear evento</h1>
      </div>
      <OrganizerEventForm />
    </div>
  );
}
