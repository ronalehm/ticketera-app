import { Headset, QrCode, ShieldCheck } from "lucide-react";

import { SectionHeader } from "@/components/shared/SectionHeader";

const HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "Compra 100% segura",
    description: "Pagos protegidos y encriptados con los principales medios de pago.",
  },
  {
    icon: QrCode,
    title: "Entrada digital con QR",
    description: "Recibe tu entrada al instante en tu correo y llévala en tu celular.",
  },
  {
    icon: Headset,
    title: "Soporte cuando lo necesites",
    description: "Te acompañamos antes, durante y después de tu evento.",
  },
];

export function TrustHighlights() {
  return (
    <section className="bg-muted">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16 lg:px-8">
        <SectionHeader
          title="Compra con confianza"
          description="Disfruta tus eventos sin preocupaciones."
        />
        <ul className="grid gap-4 md:grid-cols-3 md:gap-6">
          {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex flex-col items-start gap-4">
              <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
                <Icon aria-hidden="true" className="size-6" />
              </span>
              <div>
                <h3 className="text-base font-bold md:text-lg">{title}</h3>
                <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
