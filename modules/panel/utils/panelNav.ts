import { roleCan } from "@/modules/auth/permissions";

import type { PanelNavItem, PanelNavSection, PanelOrganizerStatus, PanelRole } from "../types/panel.types";

const ROLE_LABELS: Record<PanelRole, string> = {
  customer: "Cliente",
  organizer: "Organizador",
  admin: "Administrador",
  super_admin: "Super admin",
};

/** Etiqueta visible del rol (tarjeta de usuario del panel). */
export function getPanelRoleLabel(role: PanelRole): string {
  return ROLE_LABELS[role];
}

/**
 * Organizador no aprobado (`pending`, `suspended` o sin fila): ve el panel en solo lectura. Admin y super_admin no
 * tienen fila de organizador y su estado no los restringe.
 */
export function isReadOnlyOrganizer(role: PanelRole, organizerStatus: PanelOrganizerStatus): boolean {
  return role === "organizer" && organizerStatus !== "approved";
}

/** Secciones visibles del sidebar para el rol (sin página → "Próximamente"). Solo lectura no cambia el menú. */
export function buildPanelNav(role: PanelRole): PanelNavSection[] {
  const sections: PanelNavSection[] = [];

  if (roleCan(role, "users:manage")) {
    sections.push({
      key: "admin",
      title: "Administración",
      items: [
        { key: "admin-dashboard", label: "Dashboard", icon: "dashboard", state: "coming-soon" },
        { key: "users", label: "Usuarios", icon: "users", state: "link", href: "/admin/usuarios" },
        { key: "organizers", label: "Organizadores", icon: "organizers", state: "coming-soon" },
      ],
    });
  }

  if (roleCan(role, "events:manageOwn")) {
    sections.push({
      key: "organizer",
      title: "Organizador",
      items: [
        { key: "events", label: "Eventos", icon: "events", state: "link", href: "/organizador" },
        { key: "check-in", label: "Check-in", icon: "checkIn", state: "coming-soon" },
        { key: "payouts", label: "Pagos", icon: "payouts", state: "coming-soon" },
      ],
    });
  }

  return sections;
}

// Ítems que también quedan activos en una ruta base y sus subrutas: Crear y Editar evento siguen en «Eventos».
const SUBROUTE_PREFIXES: Partial<Record<string, string>> = { events: "/organizador/eventos" };

/** ¿La ruta actual corresponde al ítem? Coincidencia exacta (sin barra final) o, en «Eventos», sus subrutas. */
export function isPanelNavItemActive(pathname: string, item: PanelNavItem): boolean {
  if (item.state !== "link") return false;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (path === item.href) return true;
  const prefix = SUBROUTE_PREFIXES[item.key];
  return prefix !== undefined && (path === prefix || path.startsWith(`${prefix}/`));
}

/** Sección y título de la página actual para el breadcrumb (`isPanelNavItemActive`). `null` si no está en el menú. */
export function findNavItem(
  pathname: string,
  sections: PanelNavSection[],
): { section: string; title: string } | null {
  for (const section of sections) {
    const item = section.items.find((candidate) => isPanelNavItemActive(pathname, candidate));
    if (item) return { section: section.title, title: item.label };
  }
  return null;
}
