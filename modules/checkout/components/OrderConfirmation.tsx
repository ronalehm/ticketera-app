"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CalendarPlus, CircleCheck, Download, Mail, QrCode, Ticket } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { TicketQr } from "@/components/shared/TicketQr";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { buildIcsEvent, downloadIcs } from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { useStoredOrder } from "../hooks/useStoredOrder";
import type { Order } from "../types/checkout.types";
import { CheckoutStatusMessage } from "./CheckoutStatusMessage";
import { ConfirmationTicketCard } from "./ConfirmationTicketCard";

const CONTAINER_CLASS = "mx-auto flex max-w-4xl flex-col items-center gap-8 px-4 py-8 md:px-6 md:py-12";
const ACTION_CLASS = "h-11 cursor-pointer gap-2 px-4 font-semibold sm:px-6 duration-200 [&_svg:not([class*='size-'])]:size-5";
const OUTLINE_ACTION_CLASS = cn(
  ACTION_CLASS,
  "text-primary-strong hover:bg-accent hover:text-primary-strong",
);

const NEXT_STEPS: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Mail, title: "Revisa tu correo", description: "Ahí llegan tus entradas y el comprobante de pago." },
  {
    icon: QrCode,
    title: "Muestra tu QR",
    description: "Cada entrada tiene su propio QR. Muéstralo desde tu celular en el ingreso.",
  },
  {
    icon: Ticket,
    title: "Todo en Mis entradas",
    description: "Entra con tu cuenta para ver y descargar tus entradas cuando quieras.",
  },
];

type OrderConfirmationProps = {
  code: string;
  /** Stepper de la compra; solo se muestra si se encuentra la orden. */
  stepper: ReactNode;
};

export function OrderConfirmation({ code, stepper }: OrderConfirmationProps) {
  const storedOrder = useStoredOrder(code);

  if (storedOrder.status === "not-found") return <CheckoutStatusMessage variant="order-not-found" />;

  if (storedOrder.status === "loading") {
    return (
      <div className={CONTAINER_CLASS}>
        <div role="status" className="flex items-center gap-3 py-16 text-muted-foreground">
          <Spinner aria-hidden className="size-5 motion-reduce:animate-none" />
          Cargando tu compra…
        </div>
      </div>
    );
  }

  const { order } = storedOrder;

  return (
    <>
      <div className="w-full print:hidden">{stepper}</div>
      <div className={CONTAINER_CLASS}>
        <ConfirmationHeader code={order.code} />
        <ConfirmationTicketCard order={order} />
        <ConfirmationActions order={order} />
        <NextSteps />
        <PrintableTickets order={order} />
      </div>
    </>
  );
}

function ConfirmationHeader({ code }: { code: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center md:gap-4">
      <span className="flex size-16 items-center justify-center rounded-full bg-accent text-primary md:size-20">
        <CircleCheck aria-hidden className="size-8 md:size-10" />
      </span>
      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">¡Compra confirmada!</h1>
      <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
        Enviamos tus entradas a tu correo. También las tienes siempre en Mis entradas.
      </p>
      <p className="flex h-9 items-center rounded-full px-4 text-sm text-muted-foreground ring-1 ring-border">
        Pedido N.º
        <strong className="ml-1.5 font-semibold text-foreground tabular-nums">{code}</strong>
      </p>
    </div>
  );
}

function ConfirmationActions({ order }: { order: Order }) {
  const { code, event, ticketCount } = order;

  function handleAddToCalendar() {
    const ticketsLabel = ticketCount === 1 ? "1 entrada" : `${ticketCount} entradas`;
    downloadIcs(
      `${event.slug}.ics`,
      buildIcsEvent({
        title: event.title,
        startsAt: event.startsAt,
        location: `${event.venue}, ${event.city}`,
        description: `Pedido ${code} · ${ticketsLabel} · Mentec Tickets`,
      }),
    );
  }

  return (
    // print:hidden en el contenedor externo para no competir con sm:flex del interno.
    <div className="flex w-full justify-center print:hidden">
      <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:justify-center">
        <Link
          href="/mis-entradas"
          className={cn(buttonVariants(), "col-span-2 hover:bg-primary-strong", ACTION_CLASS)}
        >
          <Ticket aria-hidden />
          Ver mis entradas
        </Link>
        <Button
          type="button"
          variant="outline"
          aria-label="Agregar al calendario"
          onClick={handleAddToCalendar}
          className={OUTLINE_ACTION_CLASS}
        >
          <CalendarPlus aria-hidden />
          <span className="sm:hidden">Calendario</span>
          <span className="hidden sm:inline">Agregar al calendario</span>
        </Button>
        <Button type="button" variant="outline" onClick={() => window.print()} className={OUTLINE_ACTION_CLASS}>
          <Download aria-hidden />
          Descargar PDF
        </Button>
      </div>
    </div>
  );
}

function NextSteps() {
  return (
    <section aria-labelledby="order-next-steps" className="flex w-full flex-col gap-4 print:hidden">
      <h2 id="order-next-steps" className="text-xl font-bold tracking-tight">
        Qué sigue
      </h2>
      <ol className="grid gap-3 md:grid-cols-3">
        {NEXT_STEPS.map(({ icon: Icon, title, description }) => (
          <li
            key={title}
            className="flex items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-border md:flex-col md:items-start md:gap-3 md:p-5"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary-strong">
              <Icon aria-hidden className="size-5" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{title}</span>
              <span className="text-sm leading-relaxed text-muted-foreground">{description}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Solo visible al imprimir ("Descargar PDF"): una ficha por entrada con su QR. */
function PrintableTickets({ order }: { order: Order }) {
  return (
    <section aria-labelledby="order-printable-tickets" className="hidden w-full print:block">
      <h2 id="order-printable-tickets" className="mb-4 text-xl font-bold">
        Tus entradas
      </h2>
      <ul className="flex flex-col gap-4">
        {order.tickets.map((ticket) => (
          <li
            key={ticket.code}
            className="flex break-inside-avoid items-center gap-6 rounded-2xl p-4 ring-1 ring-border"
          >
            <TicketQr value={ticket.code} className="size-28 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="font-bold tabular-nums">{ticket.code}</p>
              <p>{ticket.ticketTypeName}</p>
              {ticket.seatLabel && <p>{ticket.seatLabel}</p>}
              <p className="text-muted-foreground">Titular: {ticket.holderName}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
