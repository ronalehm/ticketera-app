import type { Metadata } from "next";
import { Lock } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { roleCan } from "@/modules/auth/permissions";
import { listEventCategories } from "@/modules/events/catalog";
import { EventFormHeader, OrganizerEventForm } from "@/modules/organizer";
import { listApprovedOrganizers, listApprovedVenuesWithSections } from "@/modules/organizer/server";
import { getPanelContext } from "@/modules/panel/server";

export const metadata: Metadata = {
  title: "Crear evento | Mentec Tickets",
};

export default async function CreateOrganizerEventPage() {
  const { user, readOnly } = await getPanelContext("events:manageOwn", { returnTo: "/organizador/eventos/nuevo" });
  // Un organizador pendiente o suspendido no crea eventos: se le explica en lugar de rebotar (el aviso global ya lo pone
  // el layout).
  if (readOnly) {
    return (
      <div className="flex flex-col gap-8 md:gap-10">
        <EventFormHeader title="Crear evento" />
        <EmptyState
          icon={Lock}
          title="No puedes crear eventos mientras tu cuenta esté en solo lectura"
          description="Cuando tu cuenta de organizador esté aprobada podrás crear y editar eventos. En Eventos ves los que ya tienes."
          actionLabel="Volver a Eventos"
          actionHref="/organizador"
        />
      </div>
    );
  }
  // Admin y super_admin eligen el organizador dueño entre los aprobados.
  const manageAny = roleCan(user.role, "events:manageAny");
  const [categories, venues, organizers] = await Promise.all([
    listEventCategories(),
    listApprovedVenuesWithSections(user),
    manageAny ? listApprovedOrganizers() : undefined,
  ]);

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <EventFormHeader title="Crear evento" />
      <OrganizerEventForm userId={user.id} categories={categories} venues={venues} organizers={organizers} />
    </div>
  );
}
