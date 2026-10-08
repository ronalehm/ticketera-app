import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PurchaseShell } from "@/components/shared/PurchaseShell";
import { publicEnv } from "@/lib/env";
import { getSessionUser } from "@/modules/auth/server";
import { buildChangeTicketsHref, CheckoutForm, CheckoutStatusMessage } from "@/modules/checkout";
import { getPendingCheckout } from "@/modules/checkout/server";
import { hasVenueMap } from "@/modules/seating/seats";

export const metadata: Metadata = { title: "Finalizar compra | Mentec Tickets" };

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const [result, user] = await Promise.all([
    getPendingCheckout((await searchParams).orden),
    // Misma regla que `payOrder` (checkout.actions.ts): si falla la sesión, se compra como invitado.
    getSessionUser().catch(() => null),
  ]);
  if (result.status === "closed") redirect(`/checkout/confirmacion?orden=${result.orderId}`);
  if (result.status !== "ok") {
    return (
      <PurchaseShell>
        {result.status === "expired" ? (
          <CheckoutStatusMessage variant="order-expired" eventSlug={result.eventSlug} />
        ) : (
          <CheckoutStatusMessage variant="order-not-found" />
        )}
      </PurchaseShell>
    );
  }

  const { order, orderId, amountCents, remainingMs } = result;
  const changeHref = buildChangeTicketsHref(order, hasVenueMap(order.event.slug));

  return (
    <PurchaseShell currentStep={2} back={{ href: changeHref, label: "Volver a entradas" }}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-6 pb-8 md:px-6 md:pt-8 md:pb-12 lg:px-8">
        <h1 className="sr-only">Finalizar compra</h1>
        <CheckoutForm
          order={order}
          orderId={orderId}
          amountCents={amountCents}
          publishableKey={publicEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
          remainingMs={remainingMs}
          changeHref={changeHref}
          // Solo los datos del comprador viajan al cliente: ni id, ni rol, ni fechas.
          buyerProfile={
            user && {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              phone: user.phone,
              documentType: user.documentType,
              documentNumber: user.documentNumber,
            }
          }
        />
      </div>
    </PurchaseShell>
  );
}
