// Entrada pública separada del barrel: los componentes cliente de la compra la importan sin arrastrar el resto de `events`.
export { formatEventPrice } from "./utils/formatEvent";
export { buildCheckoutHref, MAX_TICKETS_PER_ORDER } from "./utils/ticketOrder";
