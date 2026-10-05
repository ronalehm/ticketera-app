// Entrada pública sin `server-only`: permisos puros (solo miran el rol) que también usan los componentes de cliente.
export { can, canAssignRole, canManageUser, roleCan } from "./utils/can";
export type { Action } from "./utils/can";
