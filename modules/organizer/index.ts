// API pública: solo la importan las rutas de app/organizador/* (servidor). Los archivos internos
// del módulo se importan entre sí por ruta relativa (Decisión 17).
export { OrganizerDashboard } from "./components/OrganizerDashboard";
export { OrganizerNav } from "./components/OrganizerNav";
export { getOrganizerEvents } from "./services/organizer.service";
export type { OrganizerEvent } from "./types/organizer.types";
