// API pública: solo la importan las rutas de app/organizador/* (servidor). Los archivos internos
// del módulo se importan entre sí por ruta relativa (Decisión 17).
export { OrganizerDashboard } from "./components/OrganizerDashboard";
export { OrganizerEventForm } from "./components/OrganizerEventForm";
export { OrganizerMobileBar } from "./components/OrganizerMobileBar";
export { OrganizerSidebar } from "./components/OrganizerSidebar";
export { savedStatusSchema } from "./schemas/organizer.schema";
export { getOrganizerEvents } from "./services/organizer.service";
export type { OrganizerEvent } from "./types/organizer.types";
