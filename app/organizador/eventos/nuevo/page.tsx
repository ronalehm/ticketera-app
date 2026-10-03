import type { Metadata } from "next";

import { OrganizerEventForm } from "@/modules/organizer";

export const metadata: Metadata = {
  title: "Crear evento | Mentec Tickets",
};

// Sin enlace "volver": "Resumen" está siempre en la navegación del panel.
export default function CreateOrganizerEventPage() {
  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Crear evento</h1>
      <OrganizerEventForm />
    </div>
  );
}
