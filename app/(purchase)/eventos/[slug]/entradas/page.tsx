import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PurchaseShell } from "@/components/shared/PurchaseShell";
import { getEventBySlug, getEvents } from "@/modules/events";
import { EventPurchaseStrip, getVenueMapBySlug, hasVenueMap, TicketSelection } from "@/modules/seating";

// El generateStaticParams de /eventos/[slug] está en su page (no en un layout), así que no se hereda aquí.
export async function generateStaticParams() {
  const events = await getEvents();
  return events.filter(({ slug }) => hasVenueMap(slug)).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/eventos/[slug]/entradas">): Promise<Metadata> {
  const { slug } = await params;
  if (!hasVenueMap(slug)) return {};
  const event = await getEventBySlug(slug);
  if (!event) return {};

  return {
    title: `Elige tus entradas: ${event.title} | Mentec Tickets`,
    description: `Elige tu zona y tus entradas para ${event.title} en ${event.venue}, ${event.city}.`,
  };
}

export default async function TicketSelectionPage({ params }: PageProps<"/eventos/[slug]/entradas">) {
  const { slug } = await params;
  const [event, map] = await Promise.all([getEventBySlug(slug), getVenueMapBySlug(slug)]);
  if (!event || !map) notFound();

  // Sin padding inferior en móvil: la barra sticky de TicketSelection es el último elemento y llega al final de la página.
  return (
    <PurchaseShell currentStep={1} back={{ href: `/eventos/${event.slug}`, label: "Volver al evento" }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-6 md:px-6 md:pt-8 lg:px-8 lg:pb-12">
        <EventPurchaseStrip
          slug={event.slug}
          title={event.title}
          imageUrl={event.imageUrl}
          startsAt={event.startsAt}
          venue={event.venue}
          city={event.city}
        />
        <TicketSelection map={map} />
      </div>
    </PurchaseShell>
  );
}
