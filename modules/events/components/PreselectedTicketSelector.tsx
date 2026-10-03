"use client";

import { useSearchParams } from "next/navigation";

import { parsePreselectedQuantities } from "../utils/ticketOrder";
import { TicketSelector, type TicketSelectorProps } from "./TicketSelector";

export function PreselectedTicketSelector(props: Omit<TicketSelectorProps, "initialQuantities">) {
  const searchParams = useSearchParams();
  return (
    <TicketSelector {...props} initialQuantities={parsePreselectedQuantities(props.ticketTypes, searchParams)} />
  );
}
