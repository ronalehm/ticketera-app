import { getEventBySlug } from "@/modules/events";
import { getVenueMapForEvent, parseSeatIds } from "@/modules/seating/seats";
import { checkoutSlugSchema } from "../schemas/checkout.schema";
import type { CheckoutOrderResult } from "../types/checkout.types";
import { buildCheckoutOrder, parseTicketQuantities } from "../utils/checkoutOrder";

type SearchParams = Record<string, string | string[] | undefined>;

export async function getCheckoutOrder(searchParams: SearchParams): Promise<CheckoutOrderResult> {
  const { evento, asientos, ...ticketParams } = searchParams;
  const slug = checkoutSlugSchema.safeParse(evento);
  if (!slug.success) return { status: "not-found" };
  return resolveCheckoutOrder(slug.data, parseTicketQuantities(ticketParams), parseSeatIds(asientos));
}

export async function resolveCheckoutOrder(
  slug: string,
  quantities: Record<string, number> | null,
  seatIds: string[] | null = [],
): Promise<CheckoutOrderResult> {
  const event = await getEventBySlug(slug);
  if (!event) return { status: "not-found" };
  const map = await getVenueMapForEvent(event);
  return buildCheckoutOrder(event, quantities, { map, seatIds });
}
