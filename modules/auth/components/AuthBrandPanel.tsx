import Image from "next/image";
import Link from "next/link";

import { BrandLogo } from "@/components/shared/BrandLogo";

// Misma foto que el mock de "festival-sol-de-verano"; se copia porque auth no importa de events.
const BRAND_IMAGE_URL =
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1600&q=80";

// Móvil: franja navy con la foto a la derecha. lg: panel sticky a toda la altura con la foto a sangre.
export function AuthBrandPanel() {
  return (
    <section className="relative flex min-h-56 flex-col justify-between gap-4 overflow-hidden bg-brand-navy p-4 text-primary-foreground lg:sticky lg:top-0 lg:h-dvh lg:self-start lg:p-10">
      <div className="absolute inset-y-0 right-0 w-[44%] overflow-hidden rounded-bl-[2.5rem] lg:inset-0 lg:w-full lg:rounded-none">
        <Image
          src={BRAND_IMAGE_URL}
          alt=""
          fill
          preload
          sizes="(min-width: 1024px) 42vw, 44vw"
          className="object-cover"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-gradient-to-b from-brand-navy/70 via-brand-navy/30 to-brand-navy/90 lg:block"
      />
      <Link
        href="/"
        aria-label="Mentec Tickets: ir al inicio"
        className="relative z-10 inline-flex min-h-11 items-center self-start rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-highlight"
      >
        <BrandLogo variant="white" className="h-7 w-auto lg:h-8" />
      </Link>
      <div className="relative z-10 flex max-w-[55%] flex-col gap-2 lg:max-w-md lg:gap-3">
        <p className="text-2xl leading-tight font-bold tracking-tight lg:text-4xl">Tus entradas, siempre a mano.</p>
        <p className="leading-relaxed text-primary-foreground/80">
          Compra en minutos y lleva tu QR en el celular.
        </p>
      </div>
    </section>
  );
}
