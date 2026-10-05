import type { Metadata } from "next";

import { roleCan } from "@/modules/auth/permissions";
import { listManagedEvents } from "@/modules/events/server";
import { CreateEventLink, OrganizerEventsList, savedStatusSchema } from "@/modules/organizer";
import { getPanelContext } from "@/modules/panel/server";

export const metadata: Metadata = {
  title: "Mis eventos | Mentec Tickets",
};

export default async function OrganizerEventsPage({ searchParams }: PageProps<"/organizador/eventos">) {
  const { user, readOnly } = await getPanelContext("events:manageOwn", { returnTo: "/organizador/eventos" });
  const { guardado } = await searchParams;
  // Cualquier valor distinto de "borrador" (o repetido) da undefined: sin aviso.
  const saved = savedStatusSchema.parse(guardado);
  // Datos iniciales del listado sin filtros (los suyos o, si es admin, todos).
  const events = await listManagedEvents(user);

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Mis eventos</h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Todos tus eventos, en cualquier estado: busca y filtra para encontrarlos.
          </p>
        </div>
        {!readOnly && <CreateEventLink />}
      </header>
      <OrganizerEventsList
        userId={user.id}
        initialEvents={events}
        showOrganizer={roleCan(user.role, "events:manageAny")}
        canMutate={!readOnly}
        saved={saved}
      />
    </div>
  );
}
