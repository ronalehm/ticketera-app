import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { roleCan } from "@/modules/auth/permissions";
import { EventFormHeader, OrganizerEventForm } from "@/modules/organizer";
import { listApprovedOrganizers, listApprovedVenuesWithSections } from "@/modules/organizer/server";
import { getPanelContext } from "@/modules/panel/server";

export const metadata: Metadata = {
  title: "Crear evento | Mentec Tickets",
};

export default async function CreateOrganizerEventPage() {
  const { user, readOnly } = await getPanelContext("events:manageOwn", { returnTo: "/organizador/eventos/nuevo" });
  // Un organizador pendiente o suspendido no crea eventos.
  if (readOnly) redirect("/organizador");
  // Admin y super_admin eligen el organizador dueño entre los aprobados.
  const manageAny = roleCan(user.role, "events:manageAny");
  const [venues, organizers] = await Promise.all([
    listApprovedVenuesWithSections(),
    manageAny ? listApprovedOrganizers() : undefined,
  ]);

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <EventFormHeader title="Crear evento" />
      <OrganizerEventForm userId={user.id} venues={venues} organizers={organizers} />
    </div>
  );
}
