import "server-only";

// Entrada pública solo de servidor: precarga del listado en `/admin/usuarios` (con `DEFAULT_USERS_FILTERS`).
export { listUsers } from "./services/users.service";
