import Link from "next/link";
import { Beer, Coffee, Drama, type LucideIcon, Martini, Mic, Music, PartyPopper, Tag, Trophy, Users } from "lucide-react";

import { SectionHeader } from "@/components/shared/SectionHeader";

import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS } from "../data/categories";

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

export function CategoryGrid() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:px-8">
      <SectionHeader title="Explora por categoría" />
      <ul className="grid grid-cols-3 gap-4 md:gap-6 lg:grid-cols-6">
        {EVENT_CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICONS[category] ?? Tag;
          return (
            <li key={category}>
              <Link
                href={`/eventos?categoria=${category}`}
                className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl bg-muted p-4 text-center text-sm font-medium transition-colors duration-200 ease-out outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring md:p-6"
              >
                <Icon className="size-7 text-primary md:size-8" aria-hidden />
                {EVENT_CATEGORY_LABELS[category]}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
