import type { Metadata } from "next";

import { MyTickets } from "@/modules/tickets";

export const metadata: Metadata = {
  title: "Mis entradas | Mentec Tickets",
  robots: { index: false },
};

export default function MyTicketsPage() {
  return <MyTickets />;
}
