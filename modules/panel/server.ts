import "server-only";

// Entrada pública solo de servidor: el barrel exporta componentes de cliente y no puede arrastrar `server-only`.
export { getPanelContext } from "./services/panel.service";
