import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { EventCoverImage } from "@/components/shared/EventCoverImage";
import { formatEventDate } from "@/modules/events";

type EventPurchaseStripProps = {
  slug: string;
  title: string;
  imageUrl: string;
  startsAt: string;
  venue: string;
  city: string;
};

export function EventPurchaseStrip({ slug, title, imageUrl, startsAt, venue, city }: EventPurchaseStripProps) {
  return (
    <div className="flex flex-col gap-3">
      <Link
        href={`/eventos/${slug}`}
        className="inline-flex h-11 w-fit items-center gap-2 rounded-lg text-sm font-medium text-muted-foreground outline-none transition-colors duration-200 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver al evento
      </Link>

      <div className="flex items-center gap-4">
        <EventCoverImage
          src={imageUrl}
          alt=""
          width={64}
          height={64}
          sizes="64px"
          className="size-13 shrink-0 rounded-xl bg-muted object-cover md:size-16"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            <time dateTime={startsAt}>{formatEventDate(startsAt)}</time> · {venue}, {city}
          </p>
        </div>
      </div>
    </div>
  );
}
