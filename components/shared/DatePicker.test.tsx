import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DatePicker } from "./DatePicker";

afterEach(cleanup);

function openPicker(name: RegExp | string) {
  fireEvent.click(screen.getByRole("button", { name }));
  return screen.getByRole("grid");
}

// Botón de un día del mes visible (rdp lo nombra con la fecha completa en español).
function dayButton(day: number) {
  return screen.getByRole("button", { name: new RegExp(`\\b${day} de octubre de 2026`) });
}

describe("DatePicker", () => {
  it("muestra la fecha formateada o el placeholder", () => {
    const { rerender } = render(<DatePicker value="" onChange={() => {}} placeholder="Desde" />);
    expect(screen.getByRole("button", { name: "Desde" })).toBeTruthy();

    rerender(<DatePicker value="2026-12-05" onChange={() => {}} placeholder="Desde" />);
    expect(screen.getByRole("button", { name: "sáb 5 dic 2026" })).toBeTruthy();
  });

  it("al elegir un día emite YYYY-MM-DD sin desplazamiento y cierra el popover", () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-10-01" onChange={onChange} />);
    openPicker(/jue 1 oct 2026/);

    fireEvent.click(dayButton(5));

    expect(onChange).toHaveBeenCalledWith("2026-10-05");
    expect(screen.queryByRole("grid")).toBeNull();
  });

  it("deshabilita los días fuera de [min, max]", () => {
    render(<DatePicker value="2026-10-10" onChange={() => {}} min="2026-10-05" max="2026-10-20" />);
    openPicker(/sáb 10 oct 2026/);

    expect(dayButton(4).hasAttribute("disabled")).toBe(true);
    expect(dayButton(5).hasAttribute("disabled")).toBe(false);
    expect(dayButton(20).hasAttribute("disabled")).toBe(false);
    expect(dayButton(21).hasAttribute("disabled")).toBe(true);
  });

  it("con disabled no abre", () => {
    render(<DatePicker value="" onChange={() => {}} placeholder="Fecha" disabled />);
    const trigger = screen.getByRole("button", { name: "Fecha" });
    expect(trigger.hasAttribute("disabled")).toBe(true);

    fireEvent.click(trigger);
    expect(screen.queryByRole("grid")).toBeNull();
  });

  it("con aria-labelledby el nombre accesible suma la etiqueta y la fecha (o el placeholder)", () => {
    const { rerender } = render(
      <>
        <label id="from-label" htmlFor="from">
          Desde
        </label>
        <DatePicker id="from" aria-labelledby="from-label" value="" onChange={() => {}} placeholder="Cualquier fecha" />
      </>,
    );
    expect(screen.getByRole("button", { name: "Desde Cualquier fecha" })).toBeTruthy();

    rerender(
      <>
        <label id="from-label" htmlFor="from">
          Desde
        </label>
        <DatePicker id="from" aria-labelledby="from-label" value="2026-12-05" onChange={() => {}} />
      </>,
    );
    expect(screen.getByRole("button", { name: "Desde sáb 5 dic 2026" })).toBeTruthy();
  });

  it("reenvía id, aria-invalid, aria-describedby y className al trigger", () => {
    render(
      <DatePicker value="" onChange={() => {}} id="date" aria-invalid aria-describedby="date-error" className="extra" />,
    );
    const trigger = screen.getByRole("button", { name: "Selecciona una fecha" });
    expect(trigger.id).toBe("date");
    expect(trigger.getAttribute("aria-invalid")).toBe("true");
    expect(trigger.getAttribute("aria-describedby")).toBe("date-error");
    expect(trigger.className).toContain("extra");
  });
});
