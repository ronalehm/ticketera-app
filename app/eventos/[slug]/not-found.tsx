import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function EventNotFound() {
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-16 text-center md:px-6 md:py-24 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">No encontramos este evento</h1>
      <p className="max-w-md text-base leading-relaxed text-muted-foreground">
        Puede que el enlace sea incorrecto o que el evento ya no esté disponible.
      </p>
      <Link
        href="/"
        className={cn(
          buttonVariants({ size: "lg" }),
          "mt-2 h-11 cursor-pointer px-6 font-semibold duration-200 hover:bg-primary-strong",
        )}
      >
        Volver al inicio
      </Link>
    </section>
  );
}
