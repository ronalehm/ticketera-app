import type { Metadata } from "next";

import { requireUser } from "@/modules/auth/server";
import { MyTickets } from "@/modules/tickets";

export const metadata: Metadata = {
  title: "Mis entradas | Mentec Tickets",
  robots: { index: false },
};

export default async function MyTicketsPage() {
  await requireUser({ returnTo: "/mis-entradas" });
  return <MyTickets />;
}
