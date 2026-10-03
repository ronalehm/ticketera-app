import type { Metadata } from "next";

import { CheckoutStatusMessage, getCheckoutOrder, OrderSummary, ReservationTimer } from "@/modules/checkout";

export const metadata: Metadata = { title: "Finalizar compra | Mentec Tickets" };

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const result = await getCheckoutOrder(await searchParams);
  if (result.status !== "ok") {
    return (
      <CheckoutStatusMessage variant={result.status} eventSlug={"eventSlug" in result ? result.eventSlug : undefined} />
    );
  }

  const { order } = result;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">Finalizar compra</h1>
      <ReservationTimer eventSlug={order.event.slug} />
      <OrderSummary order={order} />
    </div>
  );
}
