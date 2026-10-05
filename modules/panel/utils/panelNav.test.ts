import { describe, expect, it } from "vitest";

import type { PanelNavSection, PanelOrganizerStatus, PanelRole } from "../types/panel.types";
import { buildPanelNav, findNavItem, getPanelRoleLabel, isReadOnlyOrganizer } from "./panelNav";

/** Resumen legible: "Sección: Etiqueta[estado]" por ítem. */
function summarize(sections: PanelNavSection[]) {
  return sections.map((section) => ({
    title: section.title,
    items: section.items.map((item) => `${item.label}:${item.state === "link" ? item.href : item.state}`),
  }));
}

const ADMIN_SECTION = {
  title: "Administración",
  items: ["Dashboard:coming-soon", "Usuarios:/admin/usuarios", "Organizadores:coming-soon"],
};

const organizerSection = (createEvent: string) => ({
  title: "Organizador",
  items: [
    "Resumen:/organizador",
    "Mis eventos:coming-soon",
    `Crear evento:${createEvent}`,
    "Check-in:coming-soon",
    "Pagos:coming-soon",
  ],
});

const CREATE_LINK = "/organizador/eventos/nuevo";

describe("buildPanelNav", () => {
  it.each<[PanelRole, PanelOrganizerStatus, ReturnType<typeof summarize>]>([
    ["customer", null, []],
    ["organizer", "approved", [organizerSection(CREATE_LINK)]],
    ["organizer", "pending", [organizerSection("read-only")]],
    ["organizer", "suspended", [organizerSection("read-only")]],
    ["organizer", null, [organizerSection("read-only")]],
    ["admin", null, [ADMIN_SECTION, organizerSection(CREATE_LINK)]],
    ["super_admin", null, [ADMIN_SECTION, organizerSection(CREATE_LINK)]],
    // El estado de organizador no restringe a admin ni super_admin.
    ["admin", "pending", [ADMIN_SECTION, organizerSection(CREATE_LINK)]],
  ])("%s con estado %s", (role, status, expected) => {
    expect(summarize(buildPanelNav(role, status))).toEqual(expected);
  });

  it("las claves de los ítems son únicas", () => {
    const keys = buildPanelNav("super_admin", null).flatMap((section) => section.items.map((item) => item.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("es serializable (sin funciones ni componentes)", () => {
    const sections = buildPanelNav("super_admin", null);
    expect(JSON.parse(JSON.stringify(sections))).toEqual(sections);
  });
});

describe("findNavItem", () => {
  const adminNav = buildPanelNav("admin", null);

  it.each([
    ["/organizador", "Organizador", "Resumen"],
    ["/organizador/eventos/nuevo", "Organizador", "Crear evento"],
    ["/admin/usuarios", "Administración", "Usuarios"],
    ["/admin/usuarios/", "Administración", "Usuarios"],
  ])("%s → %s / %s", (pathname, section, title) => {
    expect(findNavItem(pathname, adminNav)).toEqual({ section, title });
  });

  it("devuelve null para rutas fuera del menú o sin página", () => {
    expect(findNavItem("/organizador/eventos", adminNav)).toBeNull();
    expect(findNavItem("/organizador/eventos/abc/editar", adminNav)).toBeNull();
    expect(findNavItem("/", adminNav)).toBeNull();
  });

  it("no encuentra Crear evento en solo lectura (no es un enlace)", () => {
    expect(findNavItem("/organizador/eventos/nuevo", buildPanelNav("organizer", "pending"))).toBeNull();
  });
});

describe("getPanelRoleLabel", () => {
  it.each<[PanelRole, string]>([
    ["organizer", "Organizador"],
    ["admin", "Administrador"],
    ["super_admin", "Super admin"],
  ])("%s → %s", (role, label) => {
    expect(getPanelRoleLabel(role)).toBe(label);
  });
});

describe("isReadOnlyOrganizer", () => {
  it.each<[PanelRole, PanelOrganizerStatus, boolean]>([
    ["organizer", "approved", false],
    ["organizer", "pending", true],
    ["organizer", "suspended", true],
    ["organizer", null, true],
    ["admin", null, false],
    ["admin", "pending", false],
    ["super_admin", null, false],
    ["customer", null, false],
  ])("%s con estado %s → %s", (role, status, expected) => {
    expect(isReadOnlyOrganizer(role, status)).toBe(expected);
  });
});
