import { CreditCard, Search, Ticket } from "lucide-react";

import { SectionHeader } from "@/components/shared/SectionHeader";

const STEPS = [
  {
    icon: Search,
    title: "Buscar",
    description: "Encuentra el evento, artista o ciudad que te interesa.",
  },
  {
    icon: Ticket,
    title: "Elegir",
    description: "Selecciona tus entradas y la cantidad que necesitas.",
  },
  {
    icon: CreditCard,
    title: "Comprar",
    description: "Paga de forma segura y recibe tus entradas al instante.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:px-8">
        <SectionHeader
          title="Cómo funciona"
          description="Tres pasos y ya estás dentro."
          className="items-center text-center md:flex-col md:items-center"
        />
        <ol className="grid gap-6 md:grid-cols-3 md:gap-8">
          {STEPS.map(({ icon: Icon, title, description }, index) => (
            <li key={title} className="flex gap-4 md:flex-col">
              <div className="flex shrink-0 items-center gap-4">
                <span className="flex size-13 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary md:size-16">
                  <Icon aria-hidden="true" className="size-6 md:size-7" />
                </span>
                {index < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="hidden flex-1 border-t-2 border-dashed border-input md:block"
                  />
                )}
              </div>
              <div>
                <p className="text-xs font-bold tracking-wider text-primary-strong uppercase">
                  Paso {index + 1}
                </p>
                <h3 className="mt-1 text-lg font-bold md:text-xl">{title}</h3>
                <p className="mt-1 max-w-sm text-base leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
