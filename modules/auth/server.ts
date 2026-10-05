import "server-only";

// Entrada pública solo de servidor: el barrel lo importan componentes de cliente y no puede arrastrar `server-only`.
export {
  getOrganizerStatus,
  OrganizerNotApprovedError,
  requireApprovedOrganizer,
} from "./services/organizers.service";
export { getSessionUser, getVerifiedEmail, requirePermission, requireUser } from "./services/session.service";
export type { OrganizerStatus, SessionUser } from "./types/auth.types";
export type { Action } from "./utils/can";
