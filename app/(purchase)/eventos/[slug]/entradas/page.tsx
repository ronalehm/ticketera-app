import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PurchaseShell } from "@/components/shared/PurchaseShell";
import {
  getEventBySlug,
  getEvents,
  PreselectedTicketSelector,
  TicketSelector,
} from "@/modules/events";
import {
  EventPurchaseStrip,
  getVenueMapBySlug,
  PreselectedTicketSelection,
  TicketSelection,
} from "@/modules/seating";

// El generateStaticParams de /eventos/[slug] está en su page (no en un layout), así que no se hereda aquí.
// Todos los eventos (Ronald, 2026-10-08): «Comprar» siempre abre esta pantalla; con mapa, zonas y asientos; sin mapa,
// tipos de entrada y cantidades. Desde aquí se continúa al checkout.
export async function generateStaticParams() {
  const events = await getEvents();
  return events.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/eventos/[slug]/entradas">): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  if (!event) return {};

  return {
    title: `Elige tus entradas: ${event.title} | Mentec Tickets`,
    description: `Elige tus entradas para ${event.title} en ${event.venue}, ${event.city}.`,
  };
}

export default async function TicketSelectionPage({
  params,
}: PageProps<"/eventos/[slug]/entradas">) {
  const { slug } = await params;
  const [event, map] = await Promise.all([
    getEventBySlug(slug),
    getVenueMapBySlug(slug),
  ]);
  if (!event) notFound();

  const selectorProps = {
    slug: event.slug,
    status: event.status,
    priceFrom: event.priceFrom,
    ticketTypes: event.ticketTypes,
  };

  // Sin padding inferior en móvil: la barra sticky de TicketSelection es el último elemento y llega al final de la página.
  return (
    <PurchaseShell
      currentStep={1}
      back={{ href: `/eventos/${event.slug}`, label: "Volver al evento" }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 md:px-6 md:pt-8 lg:px-8 lg:pb-12">
        <EventPurchaseStrip
          slug={event.slug}
          title={event.title}
          imageUrl={event.imageUrl}
          startsAt={event.startsAt}
          venue={event.venue}
          city={event.city}
        />
        {/* La precarga (y `?zona=`) se leen en cliente: el fallback prerenderiza la pantalla sin selección (SSG). */}
        {map ? (
          <Suspense fallback={<TicketSelection map={map} />}>
            <PreselectedTicketSelection map={map} />
          </Suspense>
        ) : (
          <div className="mx-auto w-full max-w-xl">
            <Suspense fallback={<TicketSelector {...selectorProps} />}>
              <PreselectedTicketSelector {...selectorProps} />
            </Suspense>
          </div>
        )}
      </div>
    </PurchaseShell>
  );
}
