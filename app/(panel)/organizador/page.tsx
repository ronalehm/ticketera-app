import type { Metadata } from "next";

import { roleCan } from "@/modules/auth/permissions";
import { listManagedEvents } from "@/modules/events/server";
import { OrganizerDashboard, savedStatusSchema } from "@/modules/organizer";
import { getPanelContext } from "@/modules/panel/server";

export const metadata: Metadata = {
  title: "Eventos | Mentec Tickets",
};

export default async function OrganizerPage({ searchParams }: PageProps<"/organizador">) {
  const { user, readOnly } = await getPanelContext("events:manageOwn", { returnTo: "/organizador" });
  const { guardado } = await searchParams;
  // Cualquier valor distinto de "borrador" o "cambios" (o repetido) da undefined: sin aviso.
  const saved = savedStatusSchema.parse(guardado);
  // Datos iniciales de KPIs y listado sin filtros (los suyos o, si es admin, todos).
  const events = await listManagedEvents(user);

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Eventos</h1>
        <p className="text-base leading-relaxed text-muted-foreground">Ventas y gestión de todos tus eventos</p>
      </header>
      {/* Organizador no aprobado: sin acciones ni "Crear evento" (el layout muestra el aviso de solo lectura). */}
      <OrganizerDashboard
        userId={user.id}
        initialEvents={events}
        showOrganizer={roleCan(user.role, "events:manageAny")}
        role={user.role}
        canMutate={!readOnly}
        canCreate={!readOnly}
        saved={saved}
      />
    </div>
  );
}
