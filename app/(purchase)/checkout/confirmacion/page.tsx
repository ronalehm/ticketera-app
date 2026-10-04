import type { Metadata } from "next";

import { PurchaseShell } from "@/components/shared/PurchaseShell";
import { CheckoutStatusMessage, OrderConfirmation, parseOrderCode } from "@/modules/checkout";

export const metadata: Metadata = { title: "Confirmación de compra | Mentec Tickets" };

export default async function CheckoutConfirmationPage({ searchParams }: PageProps<"/checkout/confirmacion">) {
  const code = parseOrderCode((await searchParams).orden);
  if (!code) {
    return (
      <PurchaseShell>
        <CheckoutStatusMessage variant="order-not-found" />
      </PurchaseShell>
    );
  }

  return <OrderConfirmation code={code} />;
}
