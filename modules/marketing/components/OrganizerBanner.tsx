import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ctaBase =
  "h-11 cursor-pointer px-6 text-base font-semibold duration-200 focus-visible:border-foreground focus-visible:ring-foreground";

export function OrganizerBanner() {
  return (
    <section aria-labelledby="organizer-banner-title">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-brand-gradient px-6 py-10 md:px-12 md:py-14 lg:px-16">
          {/* Decoración block-based: formas en la zona cian, lejos del texto */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 md:block">
            <div className="absolute -top-10 right-24 size-40 rotate-12 rounded-3xl bg-white/10" />
            <div className="absolute top-1/3 -right-8 size-56 -rotate-6 rounded-3xl bg-white/10" />
            <div className="absolute -bottom-12 right-56 size-32 rotate-45 rounded-2xl bg-white/10" />
          </div>

          {/* Texto navy: blanco no llega a 4.5:1 sobre el degradado (MASTER §2: navy 4.5–11:1). */}
          <div className="relative max-w-2xl text-foreground">
            <p className="text-xs font-bold tracking-wider uppercase">Para organizadores</p>
            <h2
              id="organizer-banner-title"
              className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl"
            >
              Vende tus entradas con Mentec Tickets
            </h2>
            <p className="mt-4 text-lg leading-relaxed font-medium">
              Publica tu evento en minutos, cobra de forma segura y controla tus ventas en tiempo
              real.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/organizador/eventos/nuevo"
                className={cn(
                  buttonVariants(),
                  ctaBase,
                  "bg-white text-primary-strong hover:bg-white/90",
                )}
              >
                Publica tu evento
              </Link>
              <Link
                href="/organizador"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  ctaBase,
                  "border-foreground bg-transparent text-foreground hover:bg-foreground/10 hover:text-foreground",
                )}
              >
                Conoce más
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
