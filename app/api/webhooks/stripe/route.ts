import { handleStripeWebhook } from "@/modules/checkout/server";

// Cuerpo crudo (`text()`, nunca `json()`): la firma se verifica sobre los bytes exactos. Runtime Node por defecto.
export async function POST(request: Request) {
  try {
    const { status } = await handleStripeWebhook(await request.text(), request.headers.get("stripe-signature"));
    return new Response(null, { status });
  } catch {
    // El servicio ya registró el error (solo ids); 500 → Stripe reintenta.
    return new Response(null, { status: 500 });
  }
}
