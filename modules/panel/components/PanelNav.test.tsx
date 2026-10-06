import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildPanelNav } from "../utils/panelNav";
import { PanelBreadcrumb } from "./PanelBreadcrumb";
import { PanelNav } from "./PanelNav";

const navigation = vi.hoisted(() => ({ pathname: "/organizador" }));

vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

beforeEach(() => {
  navigation.pathname = "/organizador";
});

afterEach(cleanup);

describe("PanelNav", () => {
  it("agrupa los ítems bajo los encabezados de sección", () => {
    render(<PanelNav sections={buildPanelNav("admin")} />);

    const admin = screen.getByRole("list", { name: "Administración" });
    const organizer = screen.getByRole("list", { name: "Organizador" });
    expect(within(admin).getByRole("link", { name: "Usuarios" }).getAttribute("href")).toBe("/admin/usuarios");
    expect(within(organizer).getByRole("link", { name: "Eventos" }).getAttribute("href")).toBe("/organizador");
  });

  it("el organizador solo tiene Eventos, Check-in y Pagos", () => {
    render(<PanelNav sections={buildPanelNav("organizer")} />);

    const organizer = screen.getByRole("list", { name: "Organizador" });
    expect(within(organizer).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Eventos",
      "Check-inPróximamente(no disponible)",
      "PagosPróximamente(no disponible)",
    ]);
    for (const label of ["Resumen", "Mis eventos", "Crear evento"]) expect(screen.queryByText(label)).toBeNull();
  });

  it.each(["/organizador", "/organizador/eventos/nuevo", "/organizador/eventos/abc/editar"])(
    "en %s marca Eventos con aria-current y el breadcrumb es Organizador / Eventos",
    (pathname) => {
      navigation.pathname = pathname;
      render(
        <>
          <PanelBreadcrumb sections={buildPanelNav("organizer")} />
          <PanelNav sections={buildPanelNav("organizer")} />
        </>,
      );

      const nav = screen.getByRole("navigation", { name: "Panel" });
      expect(within(nav).getByRole("link", { name: "Eventos" }).getAttribute("aria-current")).toBe("page");
      const breadcrumb = screen.getByRole("navigation", { name: "Ruta de navegación" });
      expect(breadcrumb.textContent).toContain("Organizador");
      expect(within(breadcrumb).getByText("Eventos").getAttribute("aria-current")).toBe("page");
    },
  );

  it("en el panel admin solo marca el ítem exacto", () => {
    navigation.pathname = "/admin/usuarios";
    render(<PanelNav sections={buildPanelNav("admin")} />);

    expect(screen.getByRole("link", { name: "Usuarios" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Eventos" }).getAttribute("aria-current")).toBeNull();
  });

  it("Próximamente no es un enlace y anuncia su estado (badge y texto sr-only)", () => {
    render(<PanelNav sections={buildPanelNav("admin")} />);

    expect(screen.queryByRole("link", { name: /Dashboard/ })).toBeNull();
    const dashboard = screen.getByText("Dashboard").closest("li");
    expect(dashboard?.querySelector("a")).toBeNull();
    expect(dashboard?.querySelector("[aria-disabled]")).toBeNull();
    expect(dashboard?.textContent).toBe("DashboardPróximamente(no disponible)");
    // Dashboard, Organizadores, Check-in y Pagos.
    expect(screen.getAllByText("Próximamente")).toHaveLength(4);
    expect(screen.getAllByText("(no disponible)")).toHaveLength(4);
  });

  it("no muestra Administración a un organizador", () => {
    render(<PanelNav sections={buildPanelNav("organizer")} />);

    expect(screen.queryByText("Administración")).toBeNull();
    expect(screen.queryByText("Usuarios")).toBeNull();
  });

  it("en el rail mantiene los nombres accesibles y la etiqueta en title", () => {
    render(<PanelNav sections={buildPanelNav("admin")} collapsed />);

    const events = screen.getByRole("link", { name: "Eventos" });
    expect(events.getAttribute("title")).toBe("Eventos");
    expect(screen.getByRole("list", { name: "Organizador" })).toBeTruthy();
    const dashboard = screen.getByTitle("Dashboard · Próximamente");
    expect(dashboard.textContent).toBe("DashboardPróximamente(no disponible)");
  });

  it("llama a onNavigate al elegir un enlace", () => {
    const onNavigate = vi.fn();
    render(<PanelNav sections={buildPanelNav("organizer")} onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("link", { name: "Eventos" }));

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
