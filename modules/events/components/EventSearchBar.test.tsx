import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { EventFilters } from "../schemas/eventFilters.schema";
import type { MonthOption } from "../utils/eventFilters";
import { EventSearchBar } from "./EventSearchBar";

const MONTHS: MonthOption[] = [
  { value: "2026-11", label: "Noviembre 2026" },
  { value: "2026-12", label: "Diciembre 2026" },
  { value: "2027-01", label: "Enero 2027" },
];

const renderBar = (defaultValues?: EventFilters) => render(<EventSearchBar months={MONTHS} defaultValues={defaultValues} />);

const optionLabels = (select: HTMLElement) =>
  within(select)
    .getAllByRole("option")
    .map((option) => option.textContent);

const hiddenInputs = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLInputElement>('input[type="hidden"]')].map((input) => [input.name, input.value]);

afterEach(cleanup);

describe("EventSearchBar", () => {
  it("renderiza un formulario de búsqueda GET a /eventos", () => {
    renderBar();

    const form = screen.getByRole("search");
    expect(form.tagName).toBe("FORM");
    expect(form.getAttribute("action")).toBe("/eventos");
    expect(form.getAttribute("method")).toBe("get");
  });

  it("tiene el campo de texto 'Qué quieres ver' con name q y su placeholder", () => {
    renderBar();

    const query = screen.getByRole("searchbox", { name: "Qué quieres ver" }) as HTMLInputElement;
    expect(query.name).toBe("q");
    expect(query.placeholder).toBe("Artista, evento o ciudad");
  });

  it("el desplegable 'Fecha' (mes) ofrece 'Cualquier fecha' más los meses recibidos", () => {
    renderBar();

    const month = screen.getByRole("combobox", { name: "Fecha" }) as HTMLSelectElement;
    expect(month.name).toBe("mes");
    expect(optionLabels(month)).toEqual(["Cualquier fecha", "Noviembre 2026", "Diciembre 2026", "Enero 2027"]);
    expect(month.value).toBe("");
  });

  it("el desplegable 'Precio' ofrece 'Cualquier precio' y los 5 rangos", () => {
    renderBar();

    const price = screen.getByRole("combobox", { name: "Precio" }) as HTMLSelectElement;
    expect(price.name).toBe("precio");
    expect(optionLabels(price)).toEqual([
      "Cualquier precio",
      "Gratis",
      "Hasta S/ 50",
      "S/ 50 – S/ 100",
      "S/ 100 – S/ 200",
      "Más de S/ 200",
    ]);
  });

  it("tiene el botón 'Buscar' de tipo submit", () => {
    renderBar();

    expect(screen.getByRole("button", { name: "Buscar" }).getAttribute("type")).toBe("submit");
  });

  it("muestra los valores iniciales de defaultValues", () => {
    renderBar({ q: "estadio", mes: "2027-01", precio: "0-50" });

    expect((screen.getByRole("searchbox", { name: "Qué quieres ver" }) as HTMLInputElement).value).toBe("estadio");
    expect((screen.getByRole("combobox", { name: "Fecha" }) as HTMLSelectElement).value).toBe("2027-01");
    expect((screen.getByRole("combobox", { name: "Precio" }) as HTMLSelectElement).value).toBe("0-50");
  });

  it("envía ocultos los filtros que no muestra (categoria, ciudad, fecha, orden) y no q, mes ni precio", () => {
    const { container } = renderBar({
      q: "estadio",
      categoria: ["teatro", "conciertos"],
      ciudad: ["Lima"],
      mes: "2027-01",
      fecha: "2027-01-01",
      precio: "0-50",
      orden: "precio",
    });

    expect(hiddenInputs(container)).toEqual([
      ["categoria", "teatro"],
      ["categoria", "conciertos"],
      ["ciudad", "Lima"],
      ["fecha", "2027-01-01"],
      ["orden", "precio"],
    ]);
  });

  it("sin defaultValues (landing) no tiene inputs ocultos", () => {
    const { container } = renderBar();

    expect(hiddenInputs(container)).toEqual([]);
  });

  it("los campos van en el orden q, mes, precio y luego el botón", () => {
    renderBar();

    const form = screen.getByRole("search") as HTMLFormElement;
    const names = [...form.elements].map((element) => (element as HTMLInputElement).name || element.textContent);
    expect(names).toEqual(["q", "mes", "precio", "Buscar"]);
  });
});
