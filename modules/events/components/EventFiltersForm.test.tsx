import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EventFilters } from "../schemas/eventFilters.schema";
import type { FacetCounts, MonthOption } from "../utils/eventFilters";
import { EventFiltersForm, type FilterSection } from "./EventFiltersForm";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const FACETS: FacetCounts = {
  categoria: { conciertos: 2, teatro: 2, deportes: 2, festivales: 2, "stand-up": 2, familia: 1 },
  ciudad: { Lima: 6, Arequipa: 2, Cusco: 1, Trujillo: 2, Piura: 1 },
};

const MONTHS: MonthOption[] = [
  { value: "2026-11", label: "Noviembre 2026" },
  { value: "2027-01", label: "Enero 2027" },
];

const ALL_SECTIONS: FilterSection[] = ["categoria", "ciudad", "mes", "precio"];

const renderForm = (filters: EventFilters = {}, sections: FilterSection[] = ALL_SECTIONS) =>
  render(<EventFiltersForm filters={filters} facets={FACETS} months={MONTHS} sections={sections} />);

const checkbox = (name: string) => screen.getByRole("checkbox", { name }) as HTMLInputElement;
const radio = (name: string) => screen.getByRole("radio", { name }) as HTMLInputElement;
const legends = () => screen.getAllByRole("group").map((group) => group.querySelector("legend")?.textContent);
const hiddenInputs = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLInputElement>('input[type="hidden"]')].map((input) => [input.name, input.value]);

beforeEach(() => push.mockClear());
afterEach(cleanup);

describe("EventFiltersForm", () => {
  it("renderiza un formulario GET a /eventos solo con los fieldset de sections", () => {
    const { container } = renderForm({}, ["ciudad", "mes", "precio"]);

    const form = container.querySelector("form");
    expect(form?.getAttribute("action")).toBe("/eventos");
    expect(form?.getAttribute("method")).toBe("get");
    expect(legends()).toEqual(["Ciudad", "Fecha", "Precio desde"]);
    expect(screen.queryByRole("checkbox", { name: /^Teatro/ })).toBeNull();
  });

  it("con todas las secciones muestra 6 categorías, 5 ciudades, meses y rangos de precio", () => {
    renderForm();

    expect(legends()).toEqual(["Categoría", "Ciudad", "Fecha", "Precio desde"]);
    expect(screen.getAllByRole("checkbox")).toHaveLength(11);
    expect(screen.getAllByRole("radio").map((input) => input.closest("label")?.textContent)).toEqual([
      "Cualquier fecha",
      "Noviembre 2026",
      "Enero 2027",
      "Cualquier precio",
      "Gratis",
      "Hasta S/ 50",
      "S/ 50 – S/ 100",
      "S/ 100 – S/ 200",
      "Más de S/ 200",
    ]);
  });

  it("el nombre accesible de cada casilla incluye su conteo", () => {
    renderForm();

    expect(checkbox("Teatro, 2 eventos")).toBeTruthy();
    expect(checkbox("Lima, 6 eventos")).toBeTruthy();
    expect(checkbox("Cusco, 1 evento")).toBeTruthy();
  });

  it("las casillas y radios reflejan los filtros", () => {
    renderForm({ categoria: ["teatro"], ciudad: ["Lima", "Cusco"], mes: "2027-01", precio: "0-50" });

    expect(checkbox("Teatro, 2 eventos").checked).toBe(true);
    expect(checkbox("Conciertos, 2 eventos").checked).toBe(false);
    expect(checkbox("Lima, 6 eventos").checked).toBe(true);
    expect(checkbox("Cusco, 1 evento").checked).toBe(true);
    expect(checkbox("Piura, 1 evento").checked).toBe(false);
    expect(radio("Enero 2027").checked).toBe(true);
    expect(radio("Cualquier fecha").checked).toBe(false);
    expect(radio("Hasta S/ 50").checked).toBe(true);
    expect(radio("Cualquier precio").checked).toBe(false);
  });

  it("sin mes ni precio marca 'Cualquier fecha' y 'Cualquier precio' (value vacío)", () => {
    renderForm();

    expect(radio("Cualquier fecha").checked).toBe(true);
    expect(radio("Cualquier fecha").value).toBe("");
    expect(radio("Cualquier precio").checked).toBe(true);
    expect(radio("Cualquier precio").value).toBe("");
  });

  it("marcar 'Teatro' navega a /eventos?categoria=teatro sin volver arriba; con los filtros nuevos sigue marcada y con el foco", () => {
    const { rerender } = renderForm();
    const teatro = checkbox("Teatro, 2 eventos");
    teatro.focus();

    fireEvent.click(teatro);
    expect(push).toHaveBeenCalledWith("/eventos?categoria=teatro", { scroll: false });

    // Respuesta del servidor: mismos nodos (sin remontar), así que el foco no se pierde.
    rerender(
      <EventFiltersForm filters={{ categoria: ["teatro"] }} facets={FACETS} months={MONTHS} sections={ALL_SECTIONS} />,
    );
    expect(checkbox("Teatro, 2 eventos")).toBe(teatro);
    expect(teatro.checked).toBe(true);
    expect(document.activeElement).toBe(teatro);
  });

  it("marcar una categoría conserva q y orden", () => {
    renderForm({ q: "rock", orden: "precio" });

    fireEvent.click(checkbox("Teatro, 2 eventos"));

    expect(push).toHaveBeenCalledWith("/eventos?q=rock&categoria=teatro&orden=precio", { scroll: false });
  });

  it("marcar una segunda categoría la añade y desmarcar quita solo ese valor", () => {
    const { unmount } = renderForm({ categoria: ["teatro"] });
    fireEvent.click(checkbox("Conciertos, 2 eventos"));
    expect(push).toHaveBeenLastCalledWith("/eventos?categoria=teatro&categoria=conciertos", { scroll: false });
    unmount();

    renderForm({ categoria: ["teatro", "conciertos"], ciudad: ["Lima"] });
    fireEvent.click(checkbox("Teatro, 2 eventos"));
    expect(push).toHaveBeenLastCalledWith("/eventos?categoria=conciertos&ciudad=Lima", { scroll: false });
  });

  it("desmarcar el último valor quita el parámetro", () => {
    renderForm({ ciudad: ["Lima"], orden: "precio" });

    fireEvent.click(checkbox("Lima, 6 eventos"));

    expect(push).toHaveBeenCalledWith("/eventos?orden=precio", { scroll: false });
  });

  it("el radio 'Hasta S/ 50' pone precio=0-50 y 'Cualquier precio' lo quita", () => {
    const { unmount } = renderForm({ categoria: ["teatro"] });
    fireEvent.click(radio("Hasta S/ 50"));
    expect(push).toHaveBeenLastCalledWith("/eventos?categoria=teatro&precio=0-50", { scroll: false });
    unmount();

    renderForm({ categoria: ["teatro"], precio: "0-50" });
    fireEvent.click(radio("Cualquier precio"));
    expect(push).toHaveBeenLastCalledWith("/eventos?categoria=teatro", { scroll: false });
  });

  it("los radios de fecha ponen y quitan mes", () => {
    const { unmount } = renderForm();
    fireEvent.click(radio("Noviembre 2026"));
    expect(push).toHaveBeenLastCalledWith("/eventos?mes=2026-11", { scroll: false });
    unmount();

    renderForm({ mes: "2026-11" });
    fireEvent.click(radio("Cualquier fecha"));
    expect(push).toHaveBeenLastCalledWith("/eventos", { scroll: false });
  });

  it("sin la sección categoria, envía ocultos cada categoría activa más q, fecha y orden", () => {
    const { container } = renderForm(
      { q: "rock", categoria: ["teatro", "conciertos"], ciudad: ["Lima"], fecha: "2027-01-01", orden: "precio" },
      ["ciudad", "mes", "precio"],
    );

    expect(hiddenInputs(container)).toEqual([
      ["q", "rock"],
      ["categoria", "teatro"],
      ["categoria", "conciertos"],
      ["fecha", "2027-01-01"],
      ["orden", "precio"],
    ]);
  });

  it("no crea inputs ocultos para los filtros de sus propias secciones", () => {
    const { container } = renderForm({ categoria: ["teatro"], ciudad: ["Lima"], mes: "2026-11", precio: "gratis" });

    expect(hiddenInputs(container)).toEqual([]);
  });
});
