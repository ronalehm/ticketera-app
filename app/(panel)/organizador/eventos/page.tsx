import { redirect } from "next/navigation";

import { savedStatusSchema } from "@/modules/organizer";

/** «Mis eventos» se fusionó en «Eventos» (`/organizador`): redirige conservando solo un `guardado` válido. */
export default async function OrganizerEventsPage({ searchParams }: PageProps<"/organizador/eventos">) {
  const saved = savedStatusSchema.parse((await searchParams).guardado);
  redirect(saved ? `/organizador?guardado=${saved}` : "/organizador");
}
