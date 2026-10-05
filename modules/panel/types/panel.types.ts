import type { OrganizerStatus, SessionUser } from "@/modules/auth/server";

export type PanelRole = SessionUser["role"];

/** Estado de organizador; `null` si el usuario no tiene fila en `organizers`. */
export type PanelOrganizerStatus = OrganizerStatus | null;

/** Clave serializable del icono: el cliente la resuelve a un componente de lucide-react (`PanelNav`). */
export type PanelNavIcon =
  | "dashboard"
  | "users"
  | "organizers"
  | "summary"
  | "events"
  | "create"
  | "checkIn"
  | "payouts";

type PanelNavItemBase = {
  key: string;
  label: string;
  icon: PanelNavIcon;
};

/**
 * Ítem de la navegación. Solo `link` navega; `coming-soon` (sin página aún) y `read-only` (organizador no aprobado)
 * se muestran deshabilitados con su badge.
 */
export type PanelNavItem =
  | (PanelNavItemBase & { state: "link"; href: string })
  | (PanelNavItemBase & { state: "coming-soon" | "read-only" });

export type PanelNavSection = {
  key: "admin" | "organizer";
  title: string;
  items: PanelNavItem[];
};

/** Contexto de una ruta del panel: usuario con permiso y estado de organizador (`null` si el rol no es organizer). */
export type PanelContext = {
  user: SessionUser;
  organizerStatus: PanelOrganizerStatus;
  /** Organizador no aprobado: solo lectura (sin crear ni editar eventos). */
  readOnly: boolean;
};
