import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { EVENT_CATEGORY_LABELS } from "../data/categories";
import type { EventDetail } from "../types/events.types";
import { formatEventDate } from "../utils/formatEvent";

// Link directo en vez de BreadcrumbLink: su useRender usa useRef, no disponible en Server Components.
const CRUMB_LINK =
  "rounded-sm transition-colors duration-200 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function EventDetailHeader({ event }: { event: EventDetail }) {
  const categoryLabel = EVENT_CATEGORY_LABELS[event.category];

  return (
    <header className="flex flex-col gap-4 md:gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link href="/" className={CRUMB_LINK}>
              Inicio
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Link href={`/eventos?categoria=${event.category}`} className={CRUMB_LINK}>
              {categoryLabel}
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{event.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
        <Image
          src={event.imageUrl}
          alt={`${event.title} en ${event.venue}, ${event.city}`}
          fill
          preload
          sizes="(min-width: 1280px) 820px, (min-width: 1024px) 66vw, 100vw"
          className="object-cover"
        />
      </div>

      <div className="flex flex-col gap-3">
        <Badge variant="secondary" className="h-6 px-2.5 font-bold">
          {categoryLabel}
        </Badge>
        <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight md:text-6xl">{event.title}</h1>
        <ul className="flex flex-col gap-2 text-base font-medium">
          <li className="flex items-center gap-2 text-primary-strong">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            <time dateTime={event.startsAt} className="font-bold tracking-wider uppercase">
              {formatEventDate(event.startsAt)}
            </time>
          </li>
          <li className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden />
            <span>
              {event.venue}, {event.city}
            </span>
          </li>
        </ul>
      </div>
    </header>
  );
}
