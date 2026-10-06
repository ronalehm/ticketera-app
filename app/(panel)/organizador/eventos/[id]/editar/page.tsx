import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { FilePen } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { roleCan } from "@/modules/auth/permissions";
import { EDIT_IN_REVIEW_MESSAGE, EventEditNotice, EventFormHeader, OrganizerEventForm } from "@/modules/organizer";
import {
  getEventForEdit,
  listApprovedOrganizers,
  listApprovedVenuesWithSections,
} from "@/modules/organizer/server";
import { getPanelContext } from "@/modules/panel/server";

export const metadata: Metadata = {
  title: "Editar evento | Mentec Tickets",
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

  // En revisión, cancelado y finalizado no se editan (Decisión 11); borrador y publicado sí, con los límites de su estado.
  if (event.status === "pending_review" || event.status === "cancelled" || event.status === "finished") {
    const inReview = event.status === "pending_review";
    return (
      <div className="flex flex-col gap-8 md:gap-10">
        <EventFormHeader title="Editar evento" />
        <EmptyState
          icon={FilePen}
          title={inReview ? "Este evento está en revisión" : "Este evento ya no se puede editar"}
          description={
            inReview
              ? EDIT_IN_REVIEW_MESSAGE
              : "Los eventos cancelados o finalizados no se editan. En Mis eventos ves su estado actual."
          }
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
      <div className="flex flex-col gap-6">
        <EventFormHeader title={event.status === "draft" ? "Editar borrador" : "Editar evento"} />
        <EventEditNotice status={event.status} reviewNote={event.reviewNote} hasSales={event.hasSales} />
      </div>
      <OrganizerEventForm userId={user.id} venues={venues} organizers={organizers} event={event} />
    </div>
  );
}
