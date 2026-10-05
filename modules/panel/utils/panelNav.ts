import { roleCan } from "@/modules/auth/permissions";

import type { PanelNavSection, PanelOrganizerStatus, PanelRole } from "../types/panel.types";

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

/** Secciones visibles del sidebar para el rol y el estado de organizador (Decisión 3: sin página → "Próximamente"). */
export function buildPanelNav(role: PanelRole, organizerStatus: PanelOrganizerStatus): PanelNavSection[] {
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
    const readOnly = isReadOnlyOrganizer(role, organizerStatus);
    sections.push({
      key: "organizer",
      title: "Organizador",
      items: [
        { key: "summary", label: "Resumen", icon: "summary", state: "link", href: "/organizador" },
        { key: "events", label: "Mis eventos", icon: "events", state: "link", href: "/organizador/eventos" },
        readOnly
          ? { key: "create-event", label: "Crear evento", icon: "create", state: "read-only" }
          : { key: "create-event", label: "Crear evento", icon: "create", state: "link", href: "/organizador/eventos/nuevo" },
        { key: "check-in", label: "Check-in", icon: "checkIn", state: "coming-soon" },
        { key: "payouts", label: "Pagos", icon: "payouts", state: "coming-soon" },
      ],
    });
  }

  return sections;
}

/** Sección y título de la página actual para el breadcrumb (ruta exacta, sin barra final). `null` si no está en el menú. */
export function findNavItem(
  pathname: string,
  sections: PanelNavSection[],
): { section: string; title: string } | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  for (const section of sections) {
    for (const item of section.items) {
      if (item.state === "link" && item.href === path) return { section: section.title, title: item.label };
    }
  }
  return null;
}
