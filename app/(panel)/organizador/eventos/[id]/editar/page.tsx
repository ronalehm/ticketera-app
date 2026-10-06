import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FilePen, Lock } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { roleCan } from "@/modules/auth/permissions";
import { listEventCategories } from "@/modules/events/catalog";
import {
  EventEditNotice,
  EventFeaturedControl,
  EventFormHeader,
  OrganizerEventForm,
} from "@/modules/organizer";
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
  // Un organizador pendiente o suspendido no edita eventos: se le explica antes de consultar el evento (el aviso global
  // ya lo pone el layout).
  if (readOnly) {
    return (
      <div className="flex flex-col gap-8 md:gap-10">
        <EventFormHeader title="Editar evento" />
        <EmptyState
          icon={Lock}
          title="No puedes editar eventos mientras tu cuenta esté en solo lectura"
          description="Cuando tu cuenta de organizador esté aprobada podrás crear y editar eventos. En Eventos ves los que ya tienes."
          actionLabel="Volver a Eventos"
          actionHref="/organizador"
        />
      </div>
    );
  }

  // No existe o no es suyo (un admin ve cualquiera): 404, sin distinguir los dos casos.
  const event = await getEventForEdit(user, id);
  if (!event) notFound();

  const manageAny = roleCan(user.role, "events:manageAny");
  // Destacar: un admin, en cualquier estado (readOnly ya salió arriba).
  const featuredControl = manageAny ? (
    <EventFeaturedControl userId={user.id} eventId={event.id} featured={event.featured} />
  ) : undefined;

  // Cancelado y finalizado no se editan; borrador, en revisión y publicado sí, con los límites de su estado (spec
  // event-editing, Decisión 1).
  if (event.status === "cancelled" || event.status === "finished") {
    return (
      <div className="flex flex-col gap-8 md:gap-10">
        <EventFormHeader title="Editar evento" action={featuredControl} />
        <EmptyState
          icon={FilePen}
          title="Este evento ya no se puede editar"
          description="Los eventos cancelados o finalizados no se editan. En Eventos ves su estado actual."
          actionLabel="Volver a Eventos"
          actionHref="/organizador"
        />
      </div>
    );
  }

  const [categories, venues, organizers] = await Promise.all([
    listEventCategories(),
    listApprovedVenuesWithSections(),
    manageAny ? listApprovedOrganizers() : undefined,
  ]);

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <div className="flex flex-col gap-6">
        <EventFormHeader
          title={event.status === "draft" ? "Editar borrador" : "Editar evento"}
          action={featuredControl}
        />
        <EventEditNotice status={event.status} reviewNote={event.reviewNote} hasSales={event.hasSales} />
      </div>
      <OrganizerEventForm userId={user.id} categories={categories} venues={venues} organizers={organizers} event={event} />
    </div>
  );
}
