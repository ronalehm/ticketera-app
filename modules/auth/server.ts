import "server-only";

// Entrada pública solo de servidor: el barrel lo importan componentes de cliente y no puede arrastrar `server-only`.
export { getSessionUser, requireUser } from "./services/session.service";
export type { SessionUser } from "./types/auth.types";
