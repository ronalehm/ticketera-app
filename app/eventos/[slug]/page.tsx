import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  EventDetailHeader,
  EventDetailInfo,
  getEventBySlug,
  getEvents,
  getRelatedEvents,
  RelatedEvents,
  TicketSelector,
} from "@/modules/events";
import { getVenueMapBySlug, MobileBuyBar, ZonePricesCard } from "@/modules/seating";

export async function generateStaticParams() {
  const events = await getEvents();
  return events.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/eventos/[slug]">): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  if (!event) return {};

  return {
    title: `${event.title} | Mentec Tickets`,
    description: event.description.split("\n\n")[0],
  };
}

export default async function EventDetailPage({ params }: PageProps<"/eventos/[slug]">) {
  const { slug } = await params;
  const [event, relatedEvents, venueMap] = await Promise.all([
    getEventBySlug(slug),
    getRelatedEvents(slug),
    getVenueMapBySlug(slug),
  ]);
  if (!event) notFound();

  // DOM (= orden móvil): cabecera → selector → info. En lg el selector ocupa la columna derecha
  // en ambas filas y header/info caen solos en la izquierda; el wrapper le da altura para el sticky.
  // Con mapa del recinto, el selector es la tarjeta de precios por zona y se añade la barra móvil (contrato H).
  return (
    <>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:px-6 md:py-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_1fr] lg:gap-12 lg:px-8">
        <EventDetailHeader event={event} />
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {venueMap ? (
            <ZonePricesCard
              slug={event.slug}
              status={event.status}
              priceFrom={event.priceFrom}
              zones={venueMap.zones}
            />
          ) : (
            <TicketSelector
              slug={event.slug}
              status={event.status}
              priceFrom={event.priceFrom}
              ticketTypes={event.ticketTypes}
            />
          )}
        </div>
        <EventDetailInfo event={event} />
      </div>
      <RelatedEvents events={relatedEvents} />
      {venueMap && event.status !== "sold-out" && <MobileBuyBar slug={event.slug} priceFrom={event.priceFrom} />}
    </>
  );
}
