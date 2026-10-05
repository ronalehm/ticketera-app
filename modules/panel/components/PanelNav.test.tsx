import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildPanelNav } from "../utils/panelNav";
import { PanelNav } from "./PanelNav";

const navigation = vi.hoisted(() => ({ pathname: "/organizador" }));

vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

beforeEach(() => {
  navigation.pathname = "/organizador";
});

afterEach(cleanup);

describe("PanelNav", () => {
  it("agrupa los ítems bajo los encabezados de sección", () => {
    render(<PanelNav sections={buildPanelNav("admin", null)} />);

    const admin = screen.getByRole("list", { name: "Administración" });
    const organizer = screen.getByRole("list", { name: "Organizador" });
    expect(within(admin).getByRole("link", { name: "Usuarios" }).getAttribute("href")).toBe("/admin/usuarios");
    expect(within(organizer).getByRole("link", { name: "Resumen" }).getAttribute("href")).toBe("/organizador");
  });

  it("marca el enlace activo con aria-current y solo ese", () => {
    navigation.pathname = "/organizador/eventos/nuevo";
    render(<PanelNav sections={buildPanelNav("organizer", "approved")} />);

    expect(screen.getByRole("link", { name: "Crear evento" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Resumen" }).getAttribute("aria-current")).toBeNull();
  });

  it("Próximamente no es un enlace y anuncia su estado (badge y texto sr-only)", () => {
    render(<PanelNav sections={buildPanelNav("admin", null)} />);

    expect(screen.queryByRole("link", { name: /Dashboard/ })).toBeNull();
    const dashboard = screen.getByText("Dashboard").closest("li");
    expect(dashboard?.querySelector("a")).toBeNull();
    expect(dashboard?.querySelector("[aria-disabled]")).toBeNull();
    expect(dashboard?.textContent).toBe("DashboardPróximamente(no disponible)");
    expect(screen.getAllByText("Próximamente")).toHaveLength(5);
    expect(screen.getAllByText("(no disponible)")).toHaveLength(5);
  });

  it("Crear evento en solo lectura para un organizador no aprobado", () => {
    render(<PanelNav sections={buildPanelNav("organizer", "pending")} />);

    expect(screen.queryByRole("link", { name: /Crear evento/ })).toBeNull();
    const create = screen.getByText("Crear evento").closest("li");
    expect(create?.querySelector("a")).toBeNull();
    expect(create?.textContent).toBe("Crear eventoSolo lectura(no disponible)");
  });

  it("no muestra Administración a un organizador", () => {
    render(<PanelNav sections={buildPanelNav("organizer", "approved")} />);

    expect(screen.queryByText("Administración")).toBeNull();
    expect(screen.queryByText("Usuarios")).toBeNull();
  });

  it("en el rail mantiene los nombres accesibles y la etiqueta en title", () => {
    render(<PanelNav sections={buildPanelNav("admin", null)} collapsed />);

    const summary = screen.getByRole("link", { name: "Resumen" });
    expect(summary.getAttribute("title")).toBe("Resumen");
    expect(screen.getByRole("list", { name: "Organizador" })).toBeTruthy();
    const dashboard = screen.getByTitle("Dashboard · Próximamente");
    expect(dashboard.textContent).toBe("DashboardPróximamente(no disponible)");
  });

  it("llama a onNavigate al elegir un enlace", () => {
    const onNavigate = vi.fn();
    render(<PanelNav sections={buildPanelNav("organizer", "approved")} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("link", { name: "Resumen" }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
