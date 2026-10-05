import "server-only";

// Entrada pública solo de servidor para las rutas del panel: el barrel exporta componentes de cliente y no puede
// arrastrar `server-only`.
export {
  getEventForEdit,
  listApprovedOrganizers,
  listApprovedVenuesWithSections,
} from "./services/eventDrafts.service";
