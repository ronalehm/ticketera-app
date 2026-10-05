import "server-only";

// Entrada pública solo de servidor: el barrel lo importan componentes de cliente y no puede arrastrar `server-only`.
export { getOrderConfirmation, getPendingCheckout } from "./services/orders.service";
export { handleStripeWebhook } from "./services/webhook.service";
