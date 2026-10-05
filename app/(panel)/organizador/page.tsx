import type { Metadata } from "next";

import { roleCan } from "@/modules/auth/permissions";
import { listManagedEvents } from "@/modules/events/server";
import { CreateEventLink, OrganizerDashboard } from "@/modules/organizer";
import { getPanelContext } from "@/modules/panel/server";

export const metadata: Metadata = {
  title: "Panel de organizador | Mentec Tickets",
};

export default async function OrganizerPage() {
  const { user, readOnly } = await getPanelContext("events:manageOwn", { returnTo: "/organizador" });
  // Datos iniciales de la query de Resumen (todos los eventos que gestiona: los suyos o, si es admin, todos).
  const events = await listManagedEvents(user);

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Resumen</h1>
          <p className="text-base leading-relaxed text-muted-foreground">Así van las ventas de tus eventos.</p>
        </div>
        {/* Organizador no aprobado: sin "Crear evento" (el layout muestra el aviso de solo lectura). */}
        {!readOnly && <CreateEventLink />}
      </header>
      <OrganizerDashboard
        userId={user.id}
        initialEvents={events}
        showOrganizer={roleCan(user.role, "events:manageAny")}
      />
    </div>
  );
}
