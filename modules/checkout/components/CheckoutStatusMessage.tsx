import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Action = { label: string; href: "home" | "events" | "event"; primary: boolean };

const HOME: Action = { label: "Volver al inicio", href: "home", primary: true };
const RETRY: Action = { label: "Volver a elegir entradas", href: "event", primary: true };

const STATUS_CONTENT = {
  "not-found": {
    title: "No encontramos este evento",
    description: "Puede que el enlace sea incorrecto o que el evento ya no esté disponible.",
    actions: [HOME],
  },
  "sold-out": {
    title: "Entradas agotadas",
    description: "Ya no quedan entradas disponibles para este evento.",
    actions: [
      { label: "Ver más eventos", href: "events", primary: true },
      { label: "Ver el evento", href: "event", primary: false },
    ],
  },
  "invalid-tickets": {
    title: "No pudimos preparar tu compra",
    description: "Las entradas seleccionadas no son válidas o ya no están disponibles.",
    actions: [RETRY],
  },
  free: {
    title: "Este evento es de entrada libre",
    description: "No necesitas comprar entradas para asistir.",
    actions: [{ label: "Ver el evento", href: "event", primary: true }],
  },
  "not-configured": {
    title: "Pagos no configurados",
    description: "El pago en línea no está disponible en este momento. Inténtalo más tarde.",
    actions: [HOME],
  },
  "order-not-found": {
    title: "No encontramos tu compra",
    description: "El enlace de confirmación no es válido o ha caducado.",
    actions: [HOME],
  },
  "payment-processing": {
    title: "Estamos procesando tu pago",
    description: "Tu banco aún no confirma el pago. Actualiza esta página en unos minutos.",
    actions: [{ ...HOME, primary: false }],
  },
  "payment-failed": {
    title: "Tu pago no se completó",
    description: "No se realizó ningún cobro. Puedes volver a intentarlo.",
    actions: [RETRY, { ...HOME, primary: false }],
  },
} satisfies Record<string, { title: string; description: string; actions: Action[] }>;

const ACTION_CLASS = "h-11 cursor-pointer px-6 font-semibold duration-200";

type CheckoutStatusMessageProps = {
  variant: keyof typeof STATUS_CONTENT;
  /** Necesario en las variantes con enlace al evento (sold-out, invalid-tickets, free, payment-failed). */
  eventSlug?: string;
};

export function CheckoutStatusMessage({ variant, eventSlug }: CheckoutStatusMessageProps) {
  const { title, description, actions } = STATUS_CONTENT[variant];
  const hrefs = { home: "/", events: "/eventos", event: eventSlug ? `/eventos/${eventSlug}` : "/eventos" };

  return (
    <section className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-16 text-center md:px-6 md:py-24 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">{title}</h1>
      <p className="max-w-md text-base leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={hrefs[action.href]}
            className={cn(
              action.primary
                ? cn(buttonVariants({ size: "lg" }), "hover:bg-primary-strong")
                : cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "text-primary-strong hover:bg-accent hover:text-primary-strong",
                  ),
              ACTION_CLASS,
            )}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
