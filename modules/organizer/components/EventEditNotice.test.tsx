import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EventEditNotice } from "./EventEditNotice";

afterEach(cleanup);

describe("EventEditNotice", () => {
  it("un borrador rechazado muestra el motivo del administrador", () => {
    render(<EventEditNotice status="draft" reviewNote="Falta la hora de apertura." hasSales={false} />);
    expect(screen.getByText("El administrador pidió cambios")).toBeTruthy();
    expect(screen.getByText("Falta la hora de apertura.")).toBeTruthy();
  });

  it("un borrador sin rechazo no muestra nada", () => {
    const { container } = render(<EventEditNotice status="draft" reviewNote={null} hasSales={false} />);
    expect(container.textContent).toBe("");
  });

  it("en revisión avisa que sigue en revisión al guardar", () => {
    render(<EventEditNotice status="pending_review" reviewNote={null} hasSales={false} />);
    expect(screen.getByText("Este evento está en revisión")).toBeTruthy();
    expect(screen.getByText(/Al guardar sigue en revisión/)).toBeTruthy();
  });

  it("publicado: con ventas también fecha, categoría y entradas; con o sin ventas, sin recinto ni secciones", () => {
    const { unmount } = render(<EventEditNotice status="published" reviewNote={null} hasSales />);
    expect(screen.getByText(/la fecha y los nombres y precios de las entradas/)).toBeTruthy();
    expect(screen.getByText(/El recinto y las secciones a la venta ya no se cambian/)).toBeTruthy();
    unmount();

    render(<EventEditNotice status="published" reviewNote={null} hasSales={false} />);
    expect(screen.getByText(/El recinto y las secciones a la venta ya no se cambian/)).toBeTruthy();
  });
});
