import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FilePen } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { roleCan } from "@/modules/auth/permissions";
import { EventFormHeader, OrganizerEventForm } from "@/modules/organizer";
import {
  getEventForEdit,
  listApprovedOrganizers,
  listApprovedVenuesWithSections,
} from "@/modules/organizer/server";
import { getPanelContext } from "@/modules/panel/server";

export const metadata: Metadata = {
  title: "Editar borrador | Mentec Tickets",
};

export default async function EditOrganizerEventPage({ params }: PageProps<"/organizador/eventos/[id]/editar">) {
  const { id } = await params;
  const { user, readOnly } = await getPanelContext("events:manageOwn", {
    returnTo: `/organizador/eventos/${encodeURIComponent(id)}/editar`,
  });
  // Un organizador pendiente o suspendido no edita eventos.
  if (readOnly) redirect("/organizador");

  // No existe o no es suyo (un admin ve cualquiera): 404, sin distinguir los dos casos.
  const event = await getEventForEdit(user, id);
  if (!event) notFound();

  if (event.status !== "draft") {
    return (
      <div className="flex flex-col gap-8 md:gap-10">
        <EventFormHeader title="Editar evento" />
        <EmptyState
          icon={FilePen}
          title="Este evento ya no es un borrador"
          description="Solo se pueden editar borradores. En Mis eventos ves su estado actual."
          actionLabel="Volver a Mis eventos"
          actionHref="/organizador/eventos"
        />
      </div>
    );
  }

  const manageAny = roleCan(user.role, "events:manageAny");
  const [venues, organizers] = await Promise.all([
    listApprovedVenuesWithSections(),
    manageAny ? listApprovedOrganizers() : undefined,
  ]);

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <EventFormHeader title="Editar borrador" />
      <OrganizerEventForm userId={user.id} venues={venues} organizers={organizers} event={event} />
    </div>
  );
}
