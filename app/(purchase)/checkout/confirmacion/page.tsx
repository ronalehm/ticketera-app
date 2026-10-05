import type { Metadata } from "next";

import { PurchaseShell } from "@/components/shared/PurchaseShell";
import { AutoRefresh, CheckoutStatusMessage, OrderConfirmation } from "@/modules/checkout";
import { getOrderConfirmation } from "@/modules/checkout/server";

export const metadata: Metadata = { title: "Confirmación de compra | Mentec Tickets" };

export default async function CheckoutConfirmationPage({ searchParams }: PageProps<"/checkout/confirmacion">) {
  const result = await getOrderConfirmation((await searchParams).orden);
  if (result.status === "paid") return <OrderConfirmation order={result.order} />;

  return (
    <PurchaseShell>
      {result.status === "processing" && (
        <>
          <CheckoutStatusMessage variant="payment-processing" />
          <AutoRefresh />
        </>
      )}
      {result.status === "payment-failed" && <CheckoutStatusMessage variant="payment-failed" orderId={result.orderId} />}
      {result.status === "expired" && <CheckoutStatusMessage variant="order-expired" eventSlug={result.eventSlug} />}
      {result.status === "refunded" && <CheckoutStatusMessage variant="order-refunded" eventSlug={result.eventSlug} />}
      {result.status === "not-found" && <CheckoutStatusMessage variant="order-not-found" />}
    </PurchaseShell>
  );
}
