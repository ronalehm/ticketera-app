import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  buildEventMetadata,
  EventDetailHeader,
  EventDetailInfo,
  getEventBySlug,
  getEvents,
  getRelatedEvents,
  PreselectedTicketSelector,
  RelatedEvents,
  TicketSelector,
} from "@/modules/events";
import { getVenueMapBySlug, hasVenueMap, MobileBuyBar, ZonePricesCard } from "@/modules/seating";

export async function generateStaticParams() {
  const events = await getEvents();
  return events.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/eventos/[slug]">): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  return event ? buildEventMetadata(event) : {};
}

export default async function EventDetailPage({ params }: PageProps<"/eventos/[slug]">) {
  const { slug } = await params;
  const [event, relatedEvents, venueMap] = await Promise.all([
    getEventBySlug(slug),
    getRelatedEvents(slug),
    getVenueMapBySlug(slug),
  ]);
  if (!event) notFound();

  const purchaseHref = hasVenueMap(slug) ? `/eventos/${slug}/entradas` : "#entradas";
  const selectorProps = {
    slug: event.slug,
    status: event.status,
    priceFrom: event.priceFrom,
    ticketTypes: event.ticketTypes,
  };

  // DOM (= orden móvil): hero → aside de compra → información. En lg el aside pasa a la columna derecha
  // y su celda se estira con la fila para que el sticky tenga recorrido.
  // Con mapa del recinto, el aside es la tarjeta de precios por zona y se añade la barra móvil (contrato H).
  // Sin mapa, el selector precarga la selección de la URL ("Cambiar entradas") en el cliente, dentro de un
  // Suspense cuyo fallback es el selector vacío: la página no lee searchParams y sigue prerenderizada.
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-4 md:px-6 md:pt-8 lg:px-8">
        <EventDetailHeader event={event} purchaseHref={purchaseHref} />
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:px-6 md:py-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12 lg:px-8">
        <div id="entradas" className="scroll-mt-24 lg:col-start-2 lg:row-start-1">
          {venueMap ? (
            <ZonePricesCard
              slug={event.slug}
              status={event.status}
              priceFrom={event.priceFrom}
              zones={venueMap.zones}
            />
          ) : (
            <Suspense fallback={<TicketSelector {...selectorProps} />}>
              <PreselectedTicketSelector {...selectorProps} />
            </Suspense>
          )}
        </div>
        <div className="lg:col-start-1 lg:row-start-1">
          <EventDetailInfo event={event} />
        </div>
      </div>
      <RelatedEvents events={relatedEvents} category={event.category} categoryName={event.categoryName} />
      {venueMap && event.status !== "sold-out" && <MobileBuyBar slug={event.slug} priceFrom={event.priceFrom} />}
    </>
  );
}
