import type { Metadata } from "next";

import type { EventDetail } from "../types/events.types";
import { formatLongDayMonth, formatTime } from "./formatEvent";

const SITE_NAME = "Mentec Tickets";

/** Texto alternativo de la portada (hero y vista previa al compartir): "<título> en <recinto>, <ciudad>". */
export function getCoverAlt(event: Pick<EventDetail, "title" | "venue" | "city">): string {
  return `${event.title} en ${event.venue}, ${event.city}`;
}

type MetadataEvent = Pick<EventDetail, "slug" | "title" | "venue" | "city" | "startsAt" | "description" | "imageUrl">;

/**
 * Metadata de la landing `/eventos/<slug>`: título, descripción, canonical, Open Graph y X.
 * Las URLs relativas (`canonical`, `og:url`) se resuelven con el `metadataBase` del layout raíz (`APP_URL`).
 */
export function buildEventMetadata(event: MetadataEvent): Metadata {
  const path = `/eventos/${event.slug}`;
  const description = `${event.venue}, ${event.city} · ${formatLongDayMonth(event.startsAt)}, ${formatTime(event.startsAt)} h. ${event.description.split("\n\n")[0]}`;
  const image = { url: event.imageUrl, alt: getCoverAlt(event) };

  return {
    title: `${event.title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "es_PE",
      url: path,
      title: event.title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: [image],
    },
  };
}
