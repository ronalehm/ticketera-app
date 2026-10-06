import { describe, expect, it } from "vitest";

import type { PanelNavSection, PanelOrganizerStatus, PanelRole } from "../types/panel.types";
import {
  buildPanelNav,
  findNavItem,
  getPanelRoleLabel,
  isPanelNavItemActive,
  isReadOnlyOrganizer,
} from "./panelNav";

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

const ORGANIZER_SECTION = {
  title: "Organizador",
  items: ["Eventos:/organizador", "Check-in:coming-soon", "Pagos:coming-soon"],
};

describe("buildPanelNav", () => {
  // Solo lectura no cambia el menú: el aviso global va en el layout y las páginas lo explican.
  it.each<[PanelRole, ReturnType<typeof summarize>]>([
    ["customer", []],
    ["organizer", [ORGANIZER_SECTION]],
    ["admin", [ADMIN_SECTION, ORGANIZER_SECTION]],
    ["super_admin", [ADMIN_SECTION, ORGANIZER_SECTION]],
  ])("%s", (role, expected) => {
    expect(summarize(buildPanelNav(role))).toEqual(expected);
  });

  it("las claves de los ítems son únicas", () => {
    const keys = buildPanelNav("super_admin").flatMap((section) => section.items.map((item) => item.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("es serializable (sin funciones ni componentes)", () => {
    const sections = buildPanelNav("super_admin");
    expect(JSON.parse(JSON.stringify(sections))).toEqual(sections);
  });
});

describe("isPanelNavItemActive", () => {
  const [admin, organizer] = buildPanelNav("admin");
  const item = (section: PanelNavSection, key: string) => section.items.find((candidate) => candidate.key === key)!;
  const events = item(organizer, "events");
  const users = item(admin, "users");

  it.each([
    "/organizador",
    "/organizador/",
    "/organizador/eventos",
    "/organizador/eventos/nuevo",
    "/organizador/eventos/abc/editar",
  ])("Eventos activo en %s", (pathname) => {
    expect(isPanelNavItemActive(pathname, events)).toBe(true);
  });

  it.each(["/organizador/eventosx", "/organizador/pagos", "/admin/usuarios", "/"])(
    "Eventos inactivo en %s",
    (pathname) => {
      expect(isPanelNavItemActive(pathname, events)).toBe(false);
    },
  );

  it("el resto de ítems usan coincidencia exacta", () => {
    expect(isPanelNavItemActive("/admin/usuarios", users)).toBe(true);
    expect(isPanelNavItemActive("/admin/usuarios/", users)).toBe(true);
    expect(isPanelNavItemActive("/admin/usuarios/abc", users)).toBe(false);
  });

  it("un ítem sin página nunca está activo", () => {
    expect(isPanelNavItemActive("/admin", item(admin, "admin-dashboard"))).toBe(false);
  });
});

describe("findNavItem", () => {
  const adminNav = buildPanelNav("admin");

  it.each([
    ["/organizador", "Organizador", "Eventos"],
    ["/organizador/eventos", "Organizador", "Eventos"],
    ["/organizador/eventos/nuevo", "Organizador", "Eventos"],
    ["/organizador/eventos/abc/editar", "Organizador", "Eventos"],
    ["/admin/usuarios", "Administración", "Usuarios"],
    ["/admin/usuarios/", "Administración", "Usuarios"],
  ])("%s → %s / %s", (pathname, section, title) => {
    expect(findNavItem(pathname, adminNav)).toEqual({ section, title });
  });

  it("devuelve null para rutas fuera del menú o sin página", () => {
    expect(findNavItem("/organizador/pagos", adminNav)).toBeNull();
    expect(findNavItem("/admin/usuarios/abc", adminNav)).toBeNull();
    expect(findNavItem("/", adminNav)).toBeNull();
  });

  it("para un organizador las subrutas de eventos siguen en Eventos", () => {
    expect(findNavItem("/organizador/eventos/nuevo", buildPanelNav("organizer"))).toEqual({
      section: "Organizador",
      title: "Eventos",
    });
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
    ["super_admin", "pending", false],
    ["customer", null, false],
  ])("%s con estado %s → %s", (role, status, expected) => {
    expect(isReadOnlyOrganizer(role, status)).toBe(expected);
  });
});
