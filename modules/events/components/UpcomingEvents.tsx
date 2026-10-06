"use client";

import { useState } from "react";
import Link from "next/link";

import { SectionHeader } from "@/components/shared/SectionHeader";
import { buttonVariants } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS } from "../data/categories";
import type { Event } from "../types/events.types";
import { EventCard } from "./EventCard";

type Filter = Event["category"] | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todos" },
  ...EVENT_CATEGORIES.map((category) => ({ value: category, label: EVENT_CATEGORY_LABELS[category] })),
];

export function UpcomingEvents({ events }: { events: Event[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = filter === "all" ? events : events.filter((event) => event.category === filter);

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:px-8">
      <SectionHeader title="Próximos eventos" />
      <div className="-mx-4 mb-6 overflow-x-auto px-4 py-1 md:mx-0 md:mb-8 md:px-0">
        <ToggleGroup
          aria-label="Filtrar por categoría"
          value={[filter]}
          // Selección única: Base UI devuelve [] al deseleccionar; en ese caso vuelve a "Todos".
          onValueChange={(value) => setFilter((value[0] as Filter | undefined) ?? "all")}
          className="w-max"
        >
          {FILTERS.map(({ value, label }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className="h-11 cursor-pointer rounded-full border border-border px-4 hover:bg-secondary aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary-strong aria-pressed:hover:text-primary-foreground"
            >
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {visible.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl bg-muted p-8 text-center text-muted-foreground">
          No hay eventos en esta categoría por ahora.
        </p>
      )}

      <div className="mt-8 flex justify-center">
        <Link
          href="/eventos"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 cursor-pointer px-6 font-semibold")}
        >
          Ver todos los eventos
        </Link>
      </div>
    </section>
  );
}
