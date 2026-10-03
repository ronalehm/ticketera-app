import type { Metadata } from "next";

import { PurchaseStepper } from "@/components/shared/PurchaseStepper";
import { CheckoutStatusMessage, OrderConfirmation, parseOrderCode } from "@/modules/checkout";

export const metadata: Metadata = { title: "Confirmación de compra | Mentec Tickets" };

export default async function CheckoutConfirmationPage({ searchParams }: PageProps<"/checkout/confirmacion">) {
  const code = parseOrderCode((await searchParams).orden);
  if (!code) return <CheckoutStatusMessage variant="order-not-found" />;

  return <OrderConfirmation code={code} stepper={<PurchaseStepper currentStep={3} />} />;
}
