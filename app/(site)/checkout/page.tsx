import type { Metadata } from "next";

import { PurchaseStepper } from "@/components/shared/PurchaseStepper";
import { CheckoutForm, CheckoutStatusMessage, getCheckoutOrder } from "@/modules/checkout";
import { hasVenueMap } from "@/modules/seating/seats";

export const metadata: Metadata = { title: "Finalizar compra | Mentec Tickets" };

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const result = await getCheckoutOrder(await searchParams);
  if (result.status !== "ok") {
    return (
      <CheckoutStatusMessage variant={result.status} eventSlug={"eventSlug" in result ? result.eventSlug : undefined} />
    );
  }

  const { order } = result;
  const { slug } = order.event;
  const changeHref = hasVenueMap(slug) ? `/eventos/${slug}/entradas` : `/eventos/${slug}`;

  return (
    <>
      <PurchaseStepper currentStep={2} />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-6 pb-8 md:px-6 md:pt-8 md:pb-12 lg:px-8">
        <h1 className="sr-only">Finalizar compra</h1>
        <CheckoutForm order={order} changeHref={changeHref} />
      </div>
    </>
  );
}
