import type { Metadata } from "next";

import { getVerifiedEmail, requireUser } from "@/modules/auth/server";
import { claimGuestOrders, getUserPaidOrders } from "@/modules/checkout/server";
import { MyTickets, splitOrdersByDate } from "@/modules/tickets";

export const metadata: Metadata = {
  title: "Mis entradas | Mentec Tickets",
  robots: { index: false },
};

export default async function MyTicketsPage() {
  const user = await requireUser({ returnTo: "/mis-entradas" });
  const email = await getVerifiedEmail();
  if (email) await claimGuestOrders(user.id, email);
  const { upcoming, past } = splitOrdersByDate(await getUserPaidOrders(user.id), new Date());
  return <MyTickets upcoming={upcoming} past={past} />;
}
