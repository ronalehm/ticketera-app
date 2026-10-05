import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Action = { label: string; href: "home" | "event" | "checkout"; primary: boolean };

const HOME: Action = { label: "Volver al inicio", href: "home", primary: true };
const RETRY: Action = { label: "Volver a elegir entradas", href: "event", primary: true };

const STATUS_CONTENT = {
  "order-not-found": {
    title: "No encontramos tu compra",
    description: "El enlace no es válido o la compra ya no existe.",
    actions: [HOME],
  },
  "order-expired": {
    title: "Tu reserva expiró",
    description:
      "El tiempo para completar la compra terminó y liberamos tus entradas. Vuelve a elegirlas para intentarlo de nuevo.",
    actions: [RETRY],
  },
  "payment-processing": {
    title: "Estamos procesando tu pago",
    description: "Esto puede tardar unos segundos. Esta página se actualizará sola.",
    actions: [{ ...HOME, primary: false }],
  },
  "payment-failed": {
    title: "Tu pago no se completó",
    description: "No se realizó ningún cobro. Puedes volver a intentarlo mientras tu reserva siga vigente.",
    actions: [{ label: "Volver a intentar el pago", href: "checkout", primary: true }],
  },
  "order-refunded": {
    title: "No pudimos confirmar tus entradas",
    description:
      "Tu reserva venció antes de que se confirmara el pago y las entradas ya no estaban disponibles. Te devolvimos el 100 % del pago; puede tardar de 5 a 10 días hábiles en verse en tu tarjeta.",
    actions: [RETRY],
  },
} satisfies Record<string, { title: string; description: string; actions: Action[] }>;

const ACTION_CLASS = "h-11 cursor-pointer px-6 font-semibold duration-200";

type CheckoutStatusMessageProps = {
  variant: keyof typeof STATUS_CONTENT;
  /** Necesario en las variantes con enlace al evento (order-expired, order-refunded). */
  eventSlug?: string;
  /** Necesario en payment-failed ("Volver a intentar el pago" → `/checkout?orden=<id>`). */
  orderId?: string;
};

export function CheckoutStatusMessage({ variant, eventSlug, orderId }: CheckoutStatusMessageProps) {
  const { title, description, actions } = STATUS_CONTENT[variant];
  const hrefs = {
    home: "/",
    event: eventSlug ? `/eventos/${eventSlug}` : "/eventos",
    checkout: orderId ? `/checkout?orden=${orderId}` : "/",
  };

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
