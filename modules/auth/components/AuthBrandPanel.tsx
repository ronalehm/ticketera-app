import Image from "next/image";

import { BrandLogo } from "@/components/shared/BrandLogo";

// Misma foto que el mock de "festival-sol-de-verano"; se copia porque auth no importa de events.
const BRAND_IMAGE_URL =
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1600&q=80";

export function AuthBrandPanel() {
  return (
    <section className="relative flex h-52 flex-col justify-center overflow-hidden bg-brand-navy px-4 text-primary-foreground lg:h-auto lg:justify-start lg:gap-8 lg:p-10">
      <BrandLogo variant="white" className="hidden h-8 w-auto self-start lg:block" />
      <div className="absolute inset-y-0 right-0 w-[44%] overflow-hidden rounded-bl-[2.5rem] lg:relative lg:inset-auto lg:min-h-80 lg:w-full lg:flex-1 lg:rounded-2xl">
        <Image
          src={BRAND_IMAGE_URL}
          alt=""
          fill
          preload
          sizes="(min-width: 1024px) 40vw, 44vw"
          className="object-cover"
        />
      </div>
      <div className="relative flex max-w-[55%] flex-col gap-2 lg:max-w-none lg:gap-3">
        <p className="text-2xl leading-tight font-bold tracking-tight lg:text-4xl">Tus entradas, siempre a mano.</p>
        <p className="leading-relaxed text-primary-foreground/80">
          Compra en minutos y lleva tu QR en el celular.
        </p>
      </div>
    </section>
  );
}
