// Entrada pública separada del barrel: da acceso a las órdenes guardadas sin arrastrar el checkout.
export { useOrdersStore } from "./stores/orders.store";
export { buildTicketPdfInput } from "./utils/ticketPdfInput";
export type { Order, OrderTicket } from "./types/checkout.types";
