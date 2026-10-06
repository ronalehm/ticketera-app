import Link from "next/link";
import { Beer, Coffee, Drama, type LucideIcon, Martini, Mic, Music, PartyPopper, Tag, Trophy, Users } from "lucide-react";

import { SectionHeader } from "@/components/shared/SectionHeader";

import type { EventCategory } from "../types/events.types";

// Iconos de las categorías conocidas; una categoría nueva de la BD usa `Tag`.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  conciertos: Music,
  teatro: Drama,
  deportes: Trophy,
  festivales: PartyPopper,
  "stand-up": Mic,
  familia: Users,
  "cafe-shop": Coffee,
  drink: Martini,
  "bar-shop": Beer,
};

// `auto-fill` reparte cualquier número de categorías sin desbordar: 3 columnas a 375 px, 5 a 768, 7 a 1024, 9 a 1440.
export function CategoryGrid({ categories }: { categories: EventCategory[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:px-8">
      <SectionHeader title="Explora por categoría" />
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-4 md:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] md:gap-6">
        {categories.map(({ slug, name }) => {
          const Icon = CATEGORY_ICONS[slug] ?? Tag;
          return (
            <li key={slug} className="min-w-0">
              <Link
                href={`/eventos?categoria=${slug}`}
                className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl bg-muted p-4 text-center text-sm font-medium wrap-break-word hyphens-auto transition-colors duration-200 ease-out outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring md:py-6"
              >
                <Icon className="size-7 text-primary md:size-8" aria-hidden />
                {name}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
