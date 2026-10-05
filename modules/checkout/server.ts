import "server-only";

// Entrada pública solo de servidor: el barrel lo importan componentes de cliente y no puede arrastrar `server-only`.
export { getPendingCheckout } from "./services/orders.service";
